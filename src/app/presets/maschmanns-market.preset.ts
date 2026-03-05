import { ChooseCakeUIConfig } from '../models/ui-config.model';

export const MASCHMANNS_MARKET_PRESET: ChooseCakeUIConfig = {
  version: '1.0',
  chooseCake: {
    colors: {
      primary: '#a7b770',
      secondary: '#d9a96b',
      pageBackground: '#f4f2eb',
      surface: '#ffffff',
      textPrimary: '#2f2925',
      textMuted: '#6a6259',
      border: '#d8d0c3'
    },
    typography: {
      bodyFontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      headingFontFamily: "'Cormorant Garamond', 'Georgia', serif",
      googleFontHref:
        'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap'
    },
    cards: {
      preset: 'maschmanns_market',
      grid: {
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 1,
        mode: 'masonry',
        gapPx: 20
      },
      image: {
        fit: 'cover',
        ratioMode: 'orientation',
        cornerRadiusPx: 10
      },
      frame: {
        bgColor: '#ffffff',
        borderColor: '#dfd6c7',
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
        hoverMs: 190,
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
