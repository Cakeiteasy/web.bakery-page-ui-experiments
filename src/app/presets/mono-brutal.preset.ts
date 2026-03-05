import { ChooseCakeUIConfig } from '../models/ui-config.model';

export const MONO_BRUTAL_PRESET: ChooseCakeUIConfig = {
  version: '1.0',
  chooseCake: {
    colors: {
      primary: '#fef200',
      secondary: '#ffffff',
      pageBackground: '#e9e9e9',
      surface: '#ffffff',
      textPrimary: '#101010',
      textMuted: '#474747',
      border: '#111111'
    },
    typography: {
      bodyFontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
      headingFontFamily: "'Archivo Black', 'Impact', sans-serif",
      googleFontHref:
        'https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Sans:wght@400;500;700&display=swap'
    },
    cards: {
      preset: 'mono_brutal',
      grid: {
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 1,
        mode: 'uniform',
        gapPx: 14
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
        borderWidthPx: 2,
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
        overlayOpacity: 0.4
      },
      cta: {
        primaryStyle: 'outline',
        labelMode: 'order_now',
        uppercaseLabels: true
      },
      motion: {
        entry: 'none',
        hoverMs: 80,
        stagger: false
      }
    },
    categories: {
      preset: 'segmented',
      stickyMobile: true,
      showMoreBehavior: 'horizontal_scroll',
      fontSizePx: 14,
      buttonHeightPx: 42
    }
  }
};
