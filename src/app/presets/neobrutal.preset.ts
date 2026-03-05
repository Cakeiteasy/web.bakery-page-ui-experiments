import { ChooseCakeUIConfig } from '../models/ui-config.model';

export const NEOBRUTAL_PRESET: ChooseCakeUIConfig = {
  version: '1.0',
  chooseCake: {
    colors: {
      primary: '#f5c800',
      secondary: '#ff3333',
      pageBackground: '#f0f0f0',
      surface: '#fffbe6',
      textPrimary: '#111111',
      textMuted: '#444444',
      border: '#111111'
    },
    typography: {
      bodyFontFamily: "'Bricolage Grotesque', 'Trebuchet MS', sans-serif",
      headingFontFamily: "'Archivo Black', 'Impact', sans-serif",
      googleFontHref:
        'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Bricolage+Grotesque:wght@400;500;700;800&display=swap'
    },
    cards: {
      preset: 'neobrutal_grid',
      grid: {
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 1,
        mode: 'uniform',
        gapPx: 12
      },
      image: {
        fit: 'cover',
        ratioMode: 'uniform',
        uniformRatio: '1:1',
        cornerRadiusPx: 0
      },
      frame: {
        bgColor: '#ffffff',
        borderColor: '#111111',
        borderWidthPx: 3,
        shadowStyle: 'hard_offset',
        paddingPx: 0
      },
      price: {
        position: 'footer_right',
        showFromLabel: false,
        discountStyle: 'none'
      },
      overlay: {
        desktop: 'subtle',
        mobile: 'buy_button',
        blurOnHover: false,
        overlayOpacity: 0.45
      },
      cta: {
        primaryStyle: 'outline',
        labelMode: 'order_now',
        uppercaseLabels: true
      },
      motion: {
        entry: 'none',
        hoverMs: 120,
        stagger: false
      }
    },
    categories: {
      preset: 'segmented',
      stickyMobile: true,
      showMoreBehavior: 'horizontal_scroll',
      fontSizePx: 14,
      buttonHeightPx: 44
    }
  }
};
