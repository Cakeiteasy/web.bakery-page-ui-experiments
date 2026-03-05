export type PresetKey =
  | 'rosenborgbakeri'
  | 'neobrutal'
  | 'dark_luxury'
  | 'scandi_clean'
  | 'maschmanns_market'
  | 'blush_patisserie'
  | 'mono_brutal';

export type GridMode = 'masonry' | 'uniform';
export type ImageFit = 'contain' | 'cover';
export type RatioMode = 'orientation' | 'uniform';
export type UniformRatio = '1:1' | '4:5' | '3:4' | '2:3';
export type OverlayDesktopMode = 'full_overlay' | 'subtle';
export type OverlayMobileMode = 'buy_button' | 'counter_first';
export type MotionEntry = 'fly_in' | 'fade_up' | 'none';
export type CategoryPreset = 'chips' | 'segmented' | 'minimal';
export type CategoryShowMoreBehavior = 'dropdown' | 'horizontal_scroll';

export interface ChooseCakeUIConfig {
  version: '1.0';
  chooseCake: {
    colors: {
      primary: string;
      secondary: string;
      pageBackground: string;
      surface: string;
      textPrimary: string;
      textMuted: string;
      border: string;
    };
    typography: {
      bodyFontFamily: string;
      headingFontFamily: string;
      googleFontHref?: string;
    };
    cards: {
      preset: string;
      grid: {
        desktopColumns: number;
        tabletColumns: number;
        mobileColumns: number;
        mode: GridMode;
        gapPx: number;
      };
      image: {
        fit: ImageFit;
        ratioMode: RatioMode;
        uniformRatio?: UniformRatio;
        cornerRadiusPx: number;
      };
      frame?: {
        bgColor?: string;
        borderColor?: string;
        borderWidthPx?: number;
        shadowStyle?: 'none' | 'soft' | 'hard_offset';
        paddingPx?: number;
      };
      badges?: {
        discount?: boolean;
        mailDelivery?: boolean;
        sameDay?: boolean;
        customNote?: boolean;
      };
      price: {
        position: 'footer_right';
        showFromLabel: boolean;
        discountStyle: 'strike_plus_new' | 'badge_only' | 'none';
      };
      overlay: {
        desktop: OverlayDesktopMode;
        mobile: OverlayMobileMode;
        blurOnHover: boolean;
        overlayOpacity?: number;
      };
      cta: {
        primaryStyle: 'pink' | 'primary' | 'outline';
        labelMode: 'buy' | 'order_now' | 'view';
        uppercaseLabels?: boolean;
      };
      motion: {
        entry: MotionEntry;
        hoverMs: number;
        stagger?: boolean;
      };
    };
    categories: {
      preset: CategoryPreset;
      stickyMobile: boolean;
      showMoreBehavior: CategoryShowMoreBehavior;
      fontSizePx?: number;
      buttonHeightPx?: number;
    };
  };
}

export const DEFAULT_UI_CONFIG: ChooseCakeUIConfig = {
  version: '1.0',
  chooseCake: {
    colors: {
      primary: '#00dac7',
      secondary: '#fa6400',
      pageBackground: '#ffffff',
      surface: '#f6f6f6',
      textPrimary: '#333333',
      textMuted: '#6c757d',
      border: '#dcdcdc'
    },
    typography: {
      bodyFontFamily: "'Inter', 'Segoe UI', sans-serif",
      headingFontFamily: "'Inter', 'Segoe UI', sans-serif"
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
        ratioMode: 'uniform',
        uniformRatio: '4:5',
        cornerRadiusPx: 8
      },
      frame: {
        bgColor: 'transparent',
        borderColor: 'transparent',
        borderWidthPx: 0,
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
        overlayOpacity: 0.7
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
