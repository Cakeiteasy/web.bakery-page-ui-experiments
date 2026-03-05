import { ChooseCakeUIConfig } from '../models/ui-config.model';

export const SCANDI_CLEAN_PRESET: ChooseCakeUIConfig = {
  version: '1.0',
  chooseCake: {
    colors: {
      primary: '#6d9b74',
      secondary: '#c85d3a',
      pageBackground: '#e6ece2',
      surface: '#f0f4eb',
      textPrimary: '#2f332f',
      textMuted: '#646d64',
      border: '#c9d1c4'
    },
    typography: {
      bodyFontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
      headingFontFamily: "'Newsreader', 'Georgia', serif",
      googleFontHref:
        'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,700&display=swap'
    },
    cards: {
      preset: 'clean_cards',
      grid: {
        desktopColumns: 4,
        tabletColumns: 3,
        mobileColumns: 2,
        mode: 'uniform',
        gapPx: 20
      },
      image: {
        fit: 'cover',
        ratioMode: 'uniform',
        uniformRatio: '4:5',
        cornerRadiusPx: 2
      },
      frame: {
        bgColor: '#ffffff',
        borderColor: 'transparent',
        borderWidthPx: 0,
        shadowStyle: 'none',
        paddingPx: 0
      },
      price: {
        position: 'footer_right',
        showFromLabel: true,
        discountStyle: 'none'
      },
      overlay: {
        desktop: 'subtle',
        mobile: 'buy_button',
        blurOnHover: false,
        overlayOpacity: 0.5
      },
      cta: {
        primaryStyle: 'primary',
        labelMode: 'buy',
        uppercaseLabels: false
      },
      motion: {
        entry: 'fade_up',
        hoverMs: 180,
        stagger: true
      }
    },
    categories: {
      preset: 'minimal',
      stickyMobile: true,
      showMoreBehavior: 'horizontal_scroll',
      fontSizePx: 13,
      buttonHeightPx: 30
    }
  }
};
