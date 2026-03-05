import { ChooseCakeUIConfig } from '../models/ui-config.model';

export const ROSENBORGBAKERI_PRESET: ChooseCakeUIConfig = {
  version: '1.0',
  chooseCake: {
    colors: {
      primary: '#00b4a6',
      secondary: '#fa6400',
      pageBackground: '#fffaf6',
      surface: '#ffffff',
      textPrimary: '#2d2a26',
      textMuted: '#6d655e',
      border: '#e6d8c8'
    },
    typography: {
      bodyFontFamily: "'Work Sans', 'Segoe UI', sans-serif",
      headingFontFamily: "'Fraunces', 'Georgia', serif",
      googleFontHref:
        'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&display=swap'
    },
    cards: {
      preset: 'masonry_classic',
      grid: {
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 1,
        mode: 'masonry',
        gapPx: 18
      },
      image: {
        fit: 'cover',
        ratioMode: 'orientation',
        cornerRadiusPx: 8
      },
      frame: {
        bgColor: '#ffffff',
        borderColor: '#efdfcd',
        borderWidthPx: 1,
        shadowStyle: 'soft',
        paddingPx: 0
      },
      price: {
        position: 'footer_right',
        showFromLabel: true,
        discountStyle: 'strike_plus_new'
      },
      overlay: {
        desktop: 'full_overlay',
        mobile: 'buy_button',
        blurOnHover: true,
        overlayOpacity: 0.72
      },
      cta: {
        primaryStyle: 'primary',
        labelMode: 'buy',
        uppercaseLabels: false
      },
      motion: {
        entry: 'fly_in',
        hoverMs: 220,
        stagger: true
      }
    },
    categories: {
      preset: 'chips',
      stickyMobile: true,
      showMoreBehavior: 'horizontal_scroll',
      fontSizePx: 14,
      buttonHeightPx: 38
    }
  }
};
