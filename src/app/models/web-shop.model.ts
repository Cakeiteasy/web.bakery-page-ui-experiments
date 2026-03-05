export interface IWebShopThemeColorsDto {
  primary?: string;
  secondary?: string;
  background?: string;
}

export interface IWebShopThemeLogoDto {
  size?: string | null;
  url?: string;
}

export interface IWebShopThemeFaviconDto {
  url?: string;
}

export interface IWebShopThemeFooterDto {
  bg_color?: string;
  text_color?: string;
  copyright?: string;
}

export interface IWebShopThemeHeaderDto {
  bg_color?: string;
  text_color?: string;
}

export interface IWebShopHeaderLinkDto {
  show?: boolean;
  text?: string;
  type?: string;
  url?: string;
}

export interface IWebShopThemeDto {
  colors?: IWebShopThemeColorsDto;
  logo?: IWebShopThemeLogoDto;
  favicon?: IWebShopThemeFaviconDto;
  footer?: IWebShopThemeFooterDto;
  header?: IWebShopThemeHeaderDto;
  header_links_settings?: IWebShopHeaderLinkDto[];
}

export interface IWebShopImageDto {
  small?: string;
  original?: string;
}

export interface IWebShopBakeryDto {
  name?: string;
  web_site_url?: string;
  email?: string;
  phone?: string;
  image?: IWebShopImageDto;
}

export interface IWebShopResponseDto {
  shop_url?: string;
  title_web_shop?: string;
  sub_text_web_shop?: string;
  notification_bar_banner_text?: string;
  notification_bar_color?: string;
  notification_bar_button_color?: string;
  bakery?: IWebShopBakeryDto;
  theme?: IWebShopThemeDto;
}

export interface IBakeryThemeColors {
  primary?: string;
  secondary?: string;
  background?: string;
  headerBg?: string;
  headerText?: string;
  footerBg?: string;
  footerText?: string;
}

export interface IBakeryHeaderLink {
  text: string;
  type: string;
  url: string | null;
}

export interface IBakeryBranding {
  bakeryName: string;
  bakeryWebsite: string;
  bakeryEmail: string;
  bakeryPhone: string;
  logoUrl: string;
  faviconUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  notificationText: string;
  notificationColor: string;
  notificationButtonColor: string;
  headerLinks: IBakeryHeaderLink[];
  theme: IBakeryThemeColors;
}

export interface IResolvedThemeTokens {
  primary: string;
  secondary: string;
  pageBg: string;
  surface: string;
  textPrimary: string;
  textMuted: string;
  border: string;
  onPrimary: string;
  onSecondary: string;
  headerBg: string;
  headerText: string;
  footerBg: string;
  footerText: string;
  heroAccent: string;
}
