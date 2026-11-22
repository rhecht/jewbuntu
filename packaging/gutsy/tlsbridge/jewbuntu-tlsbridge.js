// Jewbuntu Classic: Firefox 2 opens HTTPS sites through the computer's own TLS bridge
// (jewbuntu-tlsbridge on 127.0.0.1:3129), because it cannot speak today's encryption itself.
// Only HTTPS goes through it; plain HTTP is unchanged. Installed by jewbuntu-web-tools and removed
// with it (not a conffile, so a removed bridge never leaves Firefox pointing at nothing).
pref("network.proxy.type", 1);
pref("network.proxy.ssl", "127.0.0.1");
pref("network.proxy.ssl_port", 3129);
pref("network.proxy.share_proxy_settings", false);
pref("network.proxy.no_proxies_on", "localhost, 127.0.0.1");
// Firefox 2 otherwise pops up a notice on entering and on leaving every secure page; with most of
// the web now on HTTPS that would be every page.
pref("security.warn_entering_secure", false);
pref("security.warn_leaving_secure", false);
// Sites hosted on SiteGround, and other anti-bot filters, drop any request that says Firefox 2 (or
// even 4) before the site sees it: a blank page. Firefox 52, the last Firefox for Pentium III-class
// computers, gets through. So Firefox introduces itself as 52, with Jewbuntu Classic named at the end.
pref("general.useragent.override", "Mozilla/5.0 (X11; Linux i686; rv:52.0) Gecko/20100101 Firefox/52.0 Jewbuntu-Classic/7.10");
