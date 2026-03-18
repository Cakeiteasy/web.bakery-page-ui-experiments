import { Routes } from '@angular/router';

import { ProductDetailsPageComponent } from './pages/product-details-page/product-details-page.component';
import { ProductsOverviewPageComponent } from './pages/products-overview-page/products-overview-page.component';
import { BuildWithAiPageComponent } from './pages/build-with-ai-page/build-with-ai-page.component';
import { PagesListComponent } from './pages/pages-list/pages-list.component';
import { DynamicPageViewComponent } from './pages/dynamic-page-view/dynamic-page-view.component';
import { AdminAiLogsComponent } from './pages/admin-ai-logs/admin-ai-logs.component';

export const appRoutes: Routes = [
  {
    path: 'pages',
    component: PagesListComponent
  },
  {
    path: 'pages/:pageId',
    component: BuildWithAiPageComponent
  },
  {
    path: 'admin/ai-logs',
    component: AdminAiLogsComponent
  },
  {
    path: '',
    component: ProductsOverviewPageComponent
  },
  {
    path: 'products/:productId',
    component: ProductDetailsPageComponent
  },
  {
    path: '**',
    component: DynamicPageViewComponent
  }
];
