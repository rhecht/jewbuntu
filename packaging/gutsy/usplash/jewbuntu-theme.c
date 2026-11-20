/* Jewbuntu Classic usplash theme (Ubuntu 7.10 boot splash).
 * Structure and progress-bar drawing after usplash 0.5.7's example theme
 * (C) 2006 Dennis Kaarsemaker, GPL-2.0-or-later.
 *
 * The bar is drawn from two small images (bar_back, bar_fore) rather than with colour numbers:
 * in 16-bit video modes usplash passes colour numbers straight through as pixel values, so a
 * palette index such as 1 comes out black, while images are converted through their palette
 * in every mode. Palette slots 0-5 (make-usplash-png.py) are background, bar track, bar, text,
 * success and failure; text only appears in verbose mode. */
#include <usplash-theme.h>
#include <usplash_backend.h>

extern struct usplash_pixmap pixmap_splash_640_480, pixmap_splash_800_600, pixmap_splash_1024_768;
extern struct usplash_pixmap pixmap_bar_back, pixmap_bar_fore;
extern struct usplash_font font_helvB10;

void t_init(struct usplash_theme *theme);
void t_clear_progressbar(struct usplash_theme *theme);
void t_draw_progressbar(struct usplash_theme *theme, int percentage);
void t_animate_step(struct usplash_theme *theme, int pulsating);

struct usplash_theme usplash_theme_800_600;
struct usplash_theme usplash_theme_1024_768;

#define COMMON \
	.font = &font_helvB10, \
	.background = 0, .progressbar_background = 1, .progressbar_foreground = 2, \
	.text_background = 0, .text_foreground = 3, .text_success = 4, .text_failure = 5, \
	.progressbar_width = 220, .progressbar_height = 6, \
	.line_height = 15, .status_width = 35, \
	.init = t_init, .clear_progressbar = t_clear_progressbar, \
	.draw_progressbar = t_draw_progressbar, .animate_step = t_animate_step

/* Bar positions are relative to the image; t_init centres them on the screen. */
struct usplash_theme usplash_theme = {
	.version = THEME_VERSION, .next = &usplash_theme_800_600, .ratio = USPLASH_4_3,
	.pixmap = &pixmap_splash_640_480, COMMON,
	.progressbar_x = 210, .progressbar_y = 345,
	.text_x = 120, .text_y = 370, .text_width = 400, .text_height = 90, .line_length = 40,
};

struct usplash_theme usplash_theme_800_600 = {
	.version = THEME_VERSION, .next = &usplash_theme_1024_768, .ratio = USPLASH_4_3,
	.pixmap = &pixmap_splash_800_600, COMMON,
	.progressbar_x = 290, .progressbar_y = 432,
	.text_x = 180, .text_y = 460, .text_width = 440, .text_height = 110, .line_length = 44,
};

struct usplash_theme usplash_theme_1024_768 = {
	.version = THEME_VERSION, .next = NULL, .ratio = USPLASH_4_3,
	.pixmap = &pixmap_splash_1024_768, COMMON,
	.progressbar_x = 402, .progressbar_y = 552,
	.text_x = 262, .text_y = 585, .text_width = 500, .text_height = 140, .line_length = 50,
};

void t_init(struct usplash_theme *theme)
{
	int x, y;
	usplash_getdimensions(&x, &y);
	theme->progressbar_x = (x - theme->pixmap->width) / 2 + theme->progressbar_x;
	theme->progressbar_y = (y - theme->pixmap->height) / 2 + theme->progressbar_y;
}

void t_clear_progressbar(struct usplash_theme *theme)
{
	t_draw_progressbar(theme, 0);
}

void t_draw_progressbar(struct usplash_theme *theme, int percentage)
{
	int w = pixmap_bar_back.width * percentage / 100;
	usplash_put(theme->progressbar_x, theme->progressbar_y, &pixmap_bar_back);
	if (percentage == 0)
		return;
	if (percentage < 0)
		usplash_put_part(theme->progressbar_x - w, theme->progressbar_y,
				 pixmap_bar_back.width + w, pixmap_bar_back.height,
				 &pixmap_bar_fore, -w, 0);
	else
		usplash_put_part(theme->progressbar_x, theme->progressbar_y, w,
				 pixmap_bar_back.height, &pixmap_bar_fore, 0, 0);
}

/* While the length of the boot is unknown (the live CD), a short segment moves to and fro. */
void t_animate_step(struct usplash_theme *theme, int pulsating)
{
	static int step = 0;
	const int pulse = 40, stride = 4, steps = (220 - 40) / 4;
	int x1;
	if (!pulsating)
		return;
	t_draw_progressbar(theme, 0);
	x1 = step < steps ? step * stride : (2 * steps - step) * stride;
	usplash_put_part(theme->progressbar_x + x1, theme->progressbar_y, pulse,
			 pixmap_bar_fore.height, &pixmap_bar_fore, x1, 0);
	step = (step + 1) % (2 * steps);
}
