import { ChooseCakeUIConfig } from '../models/ui-config.model';

export const BLUSH_PATISSERIE_PRESET: ChooseCakeUIConfig = {
  version: '1.0',
  chooseCake: {
    colors: {
      primary: '#ef6fa9',
      secondary: '#ff9f8b',
      pageBackground: '#fff3f7',
      surface: '#ffffff',
      textPrimary: '#3b2230',
      textMuted: '#7f5a6b',
      border: '#efc9da'
    },
    typography: {
      bodyFontFamily: "'Nunito Sans', 'Segoe UI', sans-serif",
      headingFontFamily: "'Playfair Display', 'Georgia', serif",
      googleFontHref:
        'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap'
    },
    cards: {
      preset: 'blush_patisserie',
      grid: {
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 1,
        mode: 'uniform',
        gapPx: 18
      },
      image: {
        fit: 'cover',
        ratioMode: 'uniform',
        uniformRatio: '4:5',
        cornerRadiusPx: 14
      },
      frame: {
        bgColor: '#ffffff',
        borderColor: '#f2d8e4',
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
        mobile: 'counter_first',
        blurOnHover: false,
        overlayOpacity: 0.46
      },
      cta: {
        primaryStyle: 'pink',
        labelMode: 'buy',
        uppercaseLabels: false
      },
      motion: {
        entry: 'fly_in',
        hoverMs: 200,
        stagger: true
      }
    },
    categories: {
      preset: 'chips',
      stickyMobile: true,
      showMoreBehavior: 'horizontal_scroll',
      fontSizePx: 14,
      buttonHeightPx: 36
    }
  }
};
