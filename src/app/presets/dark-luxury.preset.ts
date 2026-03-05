import { ChooseCakeUIConfig } from '../models/ui-config.model';

export const DARK_LUXURY_PRESET: ChooseCakeUIConfig = {
  version: '1.0',
  chooseCake: {
    colors: {
      primary: '#c9a96e',
      secondary: '#8b6fff',
      pageBackground: '#111318',
      surface: '#1e2029',
      textPrimary: '#f3e4c2',
      textMuted: '#b5a98e',
      border: '#4a3f2c'
    },
    typography: {
      bodyFontFamily: "'Manrope', 'Segoe UI', sans-serif",
      headingFontFamily: "'Cormorant Garamond', 'Georgia', serif",
      googleFontHref:
        'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;600;700&display=swap'
    },
    cards: {
      preset: 'dark_luxury',
      grid: {
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 1,
        mode: 'uniform',
        gapPx: 24
      },
      image: {
        fit: 'cover',
        ratioMode: 'uniform',
        uniformRatio: '4:5',
        cornerRadiusPx: 4
      },
      frame: {
        bgColor: 'rgba(30, 32, 41, 0.92)',
        borderColor: '#3b3126',
        borderWidthPx: 1,
        shadowStyle: 'none',
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
        blurOnHover: false,
        overlayOpacity: 0.85
      },
      cta: {
        primaryStyle: 'outline',
        labelMode: 'view',
        uppercaseLabels: false
      },
      motion: {
        entry: 'fade_up',
        hoverMs: 260,
        stagger: true
      }
    },
    categories: {
      preset: 'minimal',
      stickyMobile: true,
      showMoreBehavior: 'horizontal_scroll',
      fontSizePx: 14,
      buttonHeightPx: 32
    }
  }
};
