/*
 * jewbuntu-tlsbridge: lets a 2007 browser open today's HTTPS sites.
 *
 * Firefox 2 on Ubuntu 7.10 speaks TLS 1.0 only, which almost every site now refuses. This small
 * proxy runs on the same computer and listens on 127.0.0.1 only. Firefox sends it each HTTPS
 * request (CONNECT host:port) and:
 *
 *   1. the bridge connects to the real site itself with TLS 1.2 or 1.3 (OpenSSL 3.5), checks the
 *      site's certificate against Mozilla's list of certificate authorities and the site's name,
 *      and refuses the connection if anything is wrong;
 *   2. it then answers Firefox with TLS 1.0 and a certificate for that site, signed by a
 *      certificate authority that exists on this computer only (made at first start, never
 *      shipped, its key readable only by the bridge's own system account);
 *   3. and it passes the bytes through in both directions.
 *
 * Firefox cannot see the real certificate any more, so the bridge does that check for it, and
 * when a check fails it shows Firefox a page saying why instead of the site. Nothing is logged
 * about which sites are visited.
 *
 * usage: jewbuntu-tlsbridge init  STATE_DIR          make the authority and keys if missing
 *        jewbuntu-tlsbridge serve STATE_DIR [options]
 *            -l ADDR:PORT   listen address (default 127.0.0.1:3129; loopback only)
 *            -c FILE        trusted authorities (default /opt/jewbuntu/etc/ssl/cert.pem)
 *            -v             log failures (host names included) to stderr
 *        jewbuntu-tlsbridge version
 *
 * Part of Jewbuntu Classic (docs/gutsy.md). Licence: GPL-3.0-or-later, as the rest of Jewbuntu.
 */
#define _GNU_SOURCE
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <netdb.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <poll.h>
#include <signal.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

#include <openssl/bn.h>
#include <openssl/err.h>
#include <openssl/evp.h>
#include <openssl/pem.h>
#include <openssl/rand.h>
#include <openssl/ssl.h>
#include <openssl/x509.h>
#include <openssl/x509v3.h>

#define VERSION "1.0"
#define CA_NAME "Jewbuntu TLS bridge (this computer only)"
#define HANDSHAKE_SECONDS 30
#define IDLE_SECONDS 300
#define CONNECT_SECONDS 15

static const char *cafile = "/opt/jewbuntu/etc/ssl/cert.pem";
static int verbose;
static EVP_PKEY *ca_key, *leaf_key;
static X509 *ca_crt;

static void die(const char *fmt, ...) __attribute__((noreturn));
static void die(const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	fputs("jewbuntu-tlsbridge: ", stderr);
	vfprintf(stderr, fmt, ap);
	fputc('\n', stderr);
	va_end(ap);
	ERR_print_errors_fp(stderr);
	exit(1);
}

static void note(const char *fmt, ...)
{
	va_list ap;
	if (!verbose)
		return;
	va_start(ap, fmt);
	fputs("jewbuntu-tlsbridge: ", stderr);
	vfprintf(stderr, fmt, ap);
	fputc('\n', stderr);
	va_end(ap);
}

/* ---- the authority and keys ------------------------------------------------------------- */

static char *path_in(const char *dir, const char *name)
{
	char *p;
	if (asprintf(&p, "%s/%s", dir, name) < 0)
		die("out of memory");
	return p;
}

static void write_pem(const char *path, int mode, int (*w)(FILE *, void *), void *obj)
{
	char *tmp;
	int fd;
	FILE *f;

	if (asprintf(&tmp, "%s.new", path) < 0)
		die("out of memory");
	unlink(tmp);
	fd = open(tmp, O_WRONLY | O_CREAT | O_EXCL, mode);
	if (fd < 0 || !(f = fdopen(fd, "w")))
		die("cannot write %s: %s", tmp, strerror(errno));
	if (!w(f, obj) || fflush(f) || fsync(fd))
		die("cannot write %s", tmp);
	fclose(f);
	if (rename(tmp, path))
		die("cannot rename %s: %s", tmp, strerror(errno));
	free(tmp);
}

static int w_key(FILE *f, void *k) { return PEM_write_PrivateKey(f, k, NULL, NULL, 0, NULL, NULL); }
static int w_crt(FILE *f, void *c) { return PEM_write_X509(f, c); }

static void random_serial(X509 *x)
{
	unsigned char b[16];
	BIGNUM *bn;

	if (RAND_bytes(b, sizeof b) != 1)
		die("no random numbers");
	b[0] &= 0x7f;   /* positive */
	b[0] |= 0x40;   /* and never short */
	bn = BN_bin2bn(b, sizeof b, NULL);
	if (!bn || !BN_to_ASN1_INTEGER(bn, X509_get_serialNumber(x)))
		die("serial");
	BN_free(bn);
}

static void add_ext(X509 *issuer, X509 *x, int nid, const char *value)
{
	X509V3_CTX ctx;
	X509_EXTENSION *e;

	X509V3_set_ctx(&ctx, issuer, x, NULL, NULL, 0);
	e = X509V3_EXT_conf_nid(NULL, &ctx, nid, value);
	if (!e || !X509_add_ext(x, e, -1))
		die("certificate extension %d", nid);
	X509_EXTENSION_free(e);
}

static void make_authority(const char *dir)
{
	char *keyp = path_in(dir, "ca.key"), *crtp = path_in(dir, "ca.crt");
	char *leafp = path_in(dir, "leaf.key");
	char host[128] = "";
	EVP_PKEY *k;
	X509 *x;
	X509_NAME *n;

	if (access(keyp, R_OK) || access(crtp, R_OK)) {
		/* 2048-bit RSA and SHA-256: NSS 3.11 (Firefox 2) understands both; elliptic curves it
		 * does not. Ten years, well inside UTCTime. */
		k = EVP_RSA_gen(2048);
		x = X509_new();
		if (!k || !x)
			die("cannot make the authority key");
		X509_set_version(x, 2);
		random_serial(x);
		X509_gmtime_adj(X509_getm_notBefore(x), -86400L);
		X509_gmtime_adj(X509_getm_notAfter(x), 10L * 365 * 86400);
		X509_set_pubkey(x, k);
		n = X509_get_subject_name(x);
		gethostname(host, sizeof host - 1);
		X509_NAME_add_entry_by_txt(n, "O", MBSTRING_UTF8, (const unsigned char *)"Jewbuntu Classic", -1, -1, 0);
		if (host[0])
			X509_NAME_add_entry_by_txt(n, "OU", MBSTRING_UTF8, (const unsigned char *)host, -1, -1, 0);
		X509_NAME_add_entry_by_txt(n, "CN", MBSTRING_UTF8, (const unsigned char *)CA_NAME, -1, -1, 0);
		X509_set_issuer_name(x, n);
		add_ext(x, x, NID_basic_constraints, "critical,CA:TRUE,pathlen:0");
		add_ext(x, x, NID_key_usage, "critical,keyCertSign,cRLSign");
		add_ext(x, x, NID_subject_key_identifier, "hash");
		if (!X509_sign(x, k, EVP_sha256()))
			die("cannot sign the authority");
		write_pem(keyp, 0600, w_key, k);
		write_pem(crtp, 0644, w_crt, x);
		EVP_PKEY_free(k);
		X509_free(x);
		unlink(leafp);   /* a new authority gets a new site key too */
	}
	if (access(leafp, R_OK)) {
		/* One key for every site certificate: making an RSA key takes seconds on a Pentium III,
		 * signing a certificate takes milliseconds. */
		k = EVP_RSA_gen(2048);
		if (!k)
			die("cannot make the site key");
		write_pem(leafp, 0600, w_key, k);
		EVP_PKEY_free(k);
	}
	free(keyp);
	free(crtp);
	free(leafp);
}

static void load_authority(const char *dir)
{
	char *keyp = path_in(dir, "ca.key"), *crtp = path_in(dir, "ca.crt");
	char *leafp = path_in(dir, "leaf.key");
	FILE *f;

	if (!(f = fopen(keyp, "r")) || !(ca_key = PEM_read_PrivateKey(f, NULL, NULL, NULL)))
		die("cannot read %s (run: jewbuntu-tlsbridge init %s)", keyp, dir);
	fclose(f);
	if (!(f = fopen(crtp, "r")) || !(ca_crt = PEM_read_X509(f, NULL, NULL, NULL)))
		die("cannot read %s", crtp);
	fclose(f);
	if (!(f = fopen(leafp, "r")) || !(leaf_key = PEM_read_PrivateKey(f, NULL, NULL, NULL)))
		die("cannot read %s", leafp);
	fclose(f);
	if (!X509_check_private_key(ca_crt, ca_key))
		die("%s does not match %s", keyp, crtp);
	free(keyp);
	free(crtp);
	free(leafp);
}

static int is_ip(const char *host)
{
	unsigned char b[16];
	return inet_pton(AF_INET, host, b) == 1 || inet_pton(AF_INET6, host, b) == 1;
}

/* A certificate for one site, signed by this computer's authority. */
static X509 *mint(const char *host)
{
	X509 *x = X509_new();
	X509_NAME *n;
	char *san;

	if (!x)
		return NULL;
	X509_set_version(x, 2);
	random_serial(x);
	X509_gmtime_adj(X509_getm_notBefore(x), -86400L);
	X509_gmtime_adj(X509_getm_notAfter(x), 365L * 86400);
	X509_set_pubkey(x, leaf_key);
	n = X509_get_subject_name(x);
	/* A common name may be 64 characters at most; longer names go in the alternative name only. */
	if (strlen(host) <= 64)
		X509_NAME_add_entry_by_txt(n, "CN", MBSTRING_ASC, (const unsigned char *)host, -1, -1, 0);
	X509_NAME_add_entry_by_txt(n, "O", MBSTRING_UTF8, (const unsigned char *)CA_NAME, -1, -1, 0);
	X509_set_issuer_name(x, X509_get_subject_name(ca_crt));
	if (asprintf(&san, "%s:%s", is_ip(host) ? "IP" : "DNS", host) < 0)
		return NULL;
	add_ext(ca_crt, x, NID_subject_alt_name, san);
	free(san);
	add_ext(ca_crt, x, NID_basic_constraints, "critical,CA:FALSE");
	add_ext(ca_crt, x, NID_key_usage, "critical,digitalSignature,keyEncipherment");
	add_ext(ca_crt, x, NID_ext_key_usage, "serverAuth");
	add_ext(ca_crt, x, NID_authority_key_identifier, "keyid:always");
	if (!X509_sign(x, ca_key, EVP_sha256())) {
		X509_free(x);
		return NULL;
	}
	return x;
}

/* ---- network ------------------------------------------------------------------------------- */

static void set_timeout(int fd, int seconds)
{
	struct timeval tv = { seconds, 0 };
	setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof tv);
	setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof tv);
}

static int dial(const char *host, const char *port, char *why, size_t whylen)
{
	struct addrinfo hints, *res, *ai;
	int fd = -1, rc;

	memset(&hints, 0, sizeof hints);
	hints.ai_family = AF_UNSPEC;
	hints.ai_socktype = SOCK_STREAM;
	rc = getaddrinfo(host, port, &hints, &res);
	if (rc) {
		snprintf(why, whylen, "The name %s could not be found (%s).", host, gai_strerror(rc));
		return -1;
	}
	snprintf(why, whylen, "%s did not answer.", host);
	for (ai = res; ai; ai = ai->ai_next) {
		struct pollfd p;
		int err = 0, flags;
		socklen_t len = sizeof err;

		fd = socket(ai->ai_family, ai->ai_socktype, ai->ai_protocol);
		if (fd < 0)
			continue;
		flags = fcntl(fd, F_GETFL);
		fcntl(fd, F_SETFL, flags | O_NONBLOCK);
		rc = connect(fd, ai->ai_addr, ai->ai_addrlen);
		if (rc && errno == EINPROGRESS) {
			p.fd = fd;
			p.events = POLLOUT;
			rc = poll(&p, 1, CONNECT_SECONDS * 1000) == 1 &&
			     !getsockopt(fd, SOL_SOCKET, SO_ERROR, &err, &len) && !err ? 0 : -1;
		}
		if (!rc) {
			fcntl(fd, F_SETFL, flags);
			break;
		}
		close(fd);
		fd = -1;
	}
	freeaddrinfo(res);
	if (fd >= 0) {
		int one = 1;
		setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &one, sizeof one);
		set_timeout(fd, HANDSHAKE_SECONDS);
	}
	return fd;
}

/* Read the browser's request head (up to the blank line). Returns its length, or -1. */
static int read_head(int fd, char *buf, size_t size)
{
	size_t got = 0;
	ssize_t n;

	while (got < size - 1) {
		n = read(fd, buf + got, 1);   /* byte by byte: nothing after the head may be eaten */
		if (n <= 0)
			return -1;
		got += n;
		buf[got] = 0;
		if (got >= 4 && !memcmp(buf + got - 4, "\r\n\r\n", 4))
			return (int)got;
	}
	return -1;
}

static void plain_reply(int fd, const char *status, const char *text)
{
	char out[1024];
	int n = snprintf(out, sizeof out,
		"HTTP/1.0 %s\r\nContent-Type: text/plain\r\nConnection: close\r\nContent-Length: %zu\r\n\r\n%s",
		status, strlen(text), text);
	if (write(fd, out, n) < 0) {
		/* nothing more to say to a browser that has gone */
	}
}

/* CONNECT host:port, host:port, or [v6]:port. Only letters, digits, dots, dashes and colons. */
static int parse_target(char *line, char *host, size_t hostlen, char *port, size_t portlen)
{
	char *t, *end, *colon, *h;
	size_t i, n;

	if (strncmp(line, "CONNECT ", 8))
		return -1;
	t = line + 8;
	end = strchr(t, ' ');
	if (!end)
		return -1;
	*end = 0;
	if (*t == '[') {
		h = t + 1;
		colon = strchr(h, ']');
		if (!colon || colon[1] != ':')
			return -1;
		*colon = 0;
		colon++;
	} else {
		h = t;
		colon = strrchr(t, ':');
		if (!colon)
			return -1;
		*colon = 0;
	}
	n = strlen(h);
	if (!n || n >= hostlen || n > 253 || strlen(colon + 1) >= portlen)
		return -1;
	for (i = 0; i < n; i++) {
		char c = h[i];
		if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') ||
		      c == '.' || c == '-' || c == ':' || c == '_'))
			return -1;
	}
	if (atoi(colon + 1) < 1 || atoi(colon + 1) > 65535 || strspn(colon + 1, "0123456789") != strlen(colon + 1))
		return -1;
	for (i = 0; i < n; i++)   /* names compare in lower case */
		host[i] = (h[i] >= 'A' && h[i] <= 'Z') ? h[i] + 32 : h[i];
	host[n] = 0;
	strcpy(port, colon + 1);
	return 0;
}

static void html_escape(const char *in, char *out, size_t size)
{
	size_t o = 0;
	for (; *in && o + 7 < size; in++) {
		const char *r = NULL;
		switch (*in) {
		case '<': r = "&lt;"; break;
		case '>': r = "&gt;"; break;
		case '&': r = "&amp;"; break;
		case '"': r = "&quot;"; break;
		}
		if (r) {
			strcpy(out + o, r);
			o += strlen(r);
		} else {
			out[o++] = *in;
		}
	}
	out[o] = 0;
}

/* Firefox asked for a site the bridge would not connect to: answer inside the tunnel, so the
 * person sees why rather than Firefox's own "the connection was interrupted". */
static void error_page(SSL *b, const char *host, const char *why)
{
	char head[8192], eh[600], ew[1200], body[4096], out[5000];
	int n, m;

	/* Read (and ignore) the request so the browser is ready for the answer. */
	n = 0;
	while (n < (int)sizeof head - 1) {
		int r = SSL_read(b, head + n, sizeof head - 1 - n);
		if (r <= 0)
			break;
		n += r;
		head[n] = 0;
		if (strstr(head, "\r\n\r\n"))
			break;
	}
	html_escape(host, eh, sizeof eh);
	html_escape(why, ew, sizeof ew);
	m = snprintf(body, sizeof body,
		"<html><head><title>Not a safe connection</title></head>"
		"<body style=\"font-family:sans-serif;margin:3em;max-width:40em\">"
		"<h2>%s: not a safe connection</h2>"
		"<p>%s</p>"
		"<p>Jewbuntu's secure connection helper (the TLS bridge) checks every site for Firefox, "
		"because Firefox 2 cannot speak today's encryption itself. This site did not pass, so "
		"nothing was sent to it.</p>"
		"<p style=\"color:#555\">If the computer's date is wrong, correct it and try again.</p>"
		"</body></html>", eh, ew);
	n = snprintf(out, sizeof out,
		"HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/html; charset=utf-8\r\n"
		"Cache-Control: no-store\r\nConnection: close\r\nContent-Length: %d\r\n\r\n%s", m, body);
	SSL_write(b, out, n);
}

static int copy_once(SSL *from, SSL *to)
{
	char buf[16384];
	int n = SSL_read(from, buf, sizeof buf), off = 0;

	if (n <= 0) {
		int e = SSL_get_error(from, n);
		return (e == SSL_ERROR_WANT_READ || e == SSL_ERROR_WANT_WRITE) ? 0 : -1;
	}
	while (off < n) {
		int w = SSL_write(to, buf + off, n - off);
		if (w <= 0)
			return -1;
		off += w;
	}
	return 0;
}

static void relay(SSL *a, SSL *b)
{
	int fa = SSL_get_fd(a), fb = SSL_get_fd(b);

	set_timeout(fa, IDLE_SECONDS);
	set_timeout(fb, IDLE_SECONDS);
	for (;;) {
		struct pollfd p[2];
		int r;

		if (SSL_pending(a) > 0) { if (copy_once(a, b)) return; continue; }
		if (SSL_pending(b) > 0) { if (copy_once(b, a)) return; continue; }
		p[0].fd = fa; p[0].events = POLLIN; p[0].revents = 0;
		p[1].fd = fb; p[1].events = POLLIN; p[1].revents = 0;
		r = poll(p, 2, IDLE_SECONDS * 1000);
		if (r <= 0)
			return;
		if (p[0].revents && copy_once(a, b))
			return;
		if (p[1].revents && copy_once(b, a))
			return;
	}
}

static void handle(int client)
{
	char head[8192], host[256], port[8], why[600] = "";
	SSL_CTX *uctx = NULL, *bctx = NULL;
	SSL *up = NULL, *br = NULL;
	X509 *crt = NULL;
	int upfd = -1, ok = 0;
	long vr;

	set_timeout(client, HANDSHAKE_SECONDS);
	if (read_head(client, head, sizeof head) < 0)
		return;
	{
		char *eol = strstr(head, "\r\n");
		if (eol)
			*eol = 0;
	}
	if (parse_target(head, host, sizeof host, port, sizeof port)) {
		plain_reply(client, "405 Method Not Allowed",
			"The Jewbuntu TLS bridge only carries HTTPS (CONNECT host:port).\n");
		return;
	}

	/* 1. The real site, with today's encryption and a full certificate check. */
	upfd = dial(host, port, why, sizeof why);
	if (upfd >= 0) {
		uctx = SSL_CTX_new(TLS_client_method());
		SSL_CTX_set_min_proto_version(uctx, TLS1_2_VERSION);
		SSL_CTX_set_verify(uctx, SSL_VERIFY_PEER, NULL);
		if (SSL_CTX_load_verify_locations(uctx, cafile, NULL) != 1)
			die("cannot read %s", cafile);
		up = SSL_new(uctx);
		SSL_set_fd(up, upfd);
		if (is_ip(host)) {
			X509_VERIFY_PARAM_set1_ip_asc(SSL_get0_param(up), host);
		} else {
			SSL_set_tlsext_host_name(up, host);
			SSL_set1_host(up, host);
		}
		SSL_set_alpn_protos(up, (const unsigned char *)"\x08http/1.1", 9);
		if (SSL_connect(up) == 1) {
			ok = 1;
		} else if ((vr = SSL_get_verify_result(up)) != X509_V_OK) {
			snprintf(why, sizeof why, "The site's certificate is not valid: %s.",
				 X509_verify_cert_error_string(vr));
		} else {
			unsigned long e = ERR_peek_last_error();
			snprintf(why, sizeof why, "A secure connection to %s could not be made (%s).",
				 host, e ? ERR_reason_error_string(e) : "the site closed the connection");
		}
	}
	if (!ok)
		note("%s:%s refused: %s", host, port, why);

	/* 2. Firefox, with the encryption it knows and a certificate from this computer. */
	if (write(client, "HTTP/1.0 200 Connection established\r\n\r\n", 39) != 39)
		goto out;
	crt = mint(host);
	bctx = SSL_CTX_new(TLS_server_method());
	if (!crt || !bctx)
		goto out;
	/* Firefox 2 offers TLS 1.0 with AES-CBC and 3DES. This leg never leaves the computer. */
	SSL_CTX_set_security_level(bctx, 0);
	SSL_CTX_set_min_proto_version(bctx, TLS1_VERSION);
	SSL_CTX_set_cipher_list(bctx, "HIGH:AES128-SHA:AES256-SHA:DES-CBC3-SHA:@SECLEVEL=0");
	SSL_CTX_set_options(bctx, SSL_OP_NO_TICKET | SSL_OP_NO_COMPRESSION);
	if (SSL_CTX_use_certificate(bctx, crt) != 1 || SSL_CTX_use_PrivateKey(bctx, leaf_key) != 1)
		goto out;
	br = SSL_new(bctx);
	SSL_set_fd(br, client);
	if (SSL_accept(br) != 1) {
		note("%s: Firefox did not complete the handshake", host);
		goto out;
	}

	/* 3. Through, or the reason why not. */
	if (ok)
		relay(br, up);
	else
		error_page(br, host, why);
	SSL_shutdown(br);
	if (ok)
		SSL_shutdown(up);
out:
	SSL_free(br);
	SSL_free(up);
	SSL_CTX_free(bctx);
	SSL_CTX_free(uctx);
	X509_free(crt);
	if (upfd >= 0)
		close(upfd);
}

static int listen_on(const char *spec)
{
	char addr[64], *colon;
	struct sockaddr_in sa;
	int fd, one = 1;

	if (strlen(spec) >= sizeof addr)
		die("bad listen address %s", spec);
	strcpy(addr, spec);
	colon = strrchr(addr, ':');
	if (!colon)
		die("listen address needs a port: %s", spec);
	*colon = 0;
	memset(&sa, 0, sizeof sa);
	sa.sin_family = AF_INET;
	sa.sin_port = htons(atoi(colon + 1));
	if (inet_pton(AF_INET, addr, &sa.sin_addr) != 1)
		die("bad listen address %s", spec);
	if ((ntohl(sa.sin_addr.s_addr) >> 24) != 127)
		die("refusing to listen on %s: the bridge is for this computer only", spec);
	fd = socket(AF_INET, SOCK_STREAM, 0);
	if (fd < 0)
		die("socket: %s", strerror(errno));
	setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &one, sizeof one);
	if (bind(fd, (struct sockaddr *)&sa, sizeof sa) || listen(fd, 64))
		die("cannot listen on %s: %s", spec, strerror(errno));
	return fd;
}

int main(int argc, char **argv)
{
	const char *listen_spec = "127.0.0.1:3129";
	int lfd, i;

	if (argc >= 2 && !strcmp(argv[1], "version")) {
		printf("jewbuntu-tlsbridge %s (%s)\n", VERSION, OpenSSL_version(OPENSSL_VERSION));
		return 0;
	}
	if (argc < 3 || (strcmp(argv[1], "init") && strcmp(argv[1], "serve"))) {
		fprintf(stderr, "usage: jewbuntu-tlsbridge init STATE_DIR\n"
				"       jewbuntu-tlsbridge serve STATE_DIR [-l 127.0.0.1:PORT] [-c CAFILE] [-v]\n");
		return 2;
	}
	umask(022);
	if (!strcmp(argv[1], "init")) {
		make_authority(argv[2]);
		return 0;
	}
	for (i = 3; i < argc; i++) {
		if (!strcmp(argv[i], "-l") && i + 1 < argc)
			listen_spec = argv[++i];
		else if (!strcmp(argv[i], "-c") && i + 1 < argc)
			cafile = argv[++i];
		else if (!strcmp(argv[i], "-v"))
			verbose = 1;
		else
			die("unknown option %s", argv[i]);
	}
	if (access(cafile, R_OK))
		die("cannot read %s", cafile);
	load_authority(argv[2]);
	lfd = listen_on(listen_spec);
	signal(SIGCHLD, SIG_IGN);   /* children are never waited for */
	signal(SIGPIPE, SIG_IGN);
	for (;;) {
		int c = accept(lfd, NULL, NULL);
		pid_t pid;

		if (c < 0) {
			if (errno != EINTR)
				sleep(1);
			continue;
		}
		pid = fork();
		if (pid == 0) {
			close(lfd);
			handle(c);
			close(c);
			_exit(0);
		}
		close(c);
	}
}
