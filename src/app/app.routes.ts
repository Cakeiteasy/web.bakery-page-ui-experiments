import { Routes } from '@angular/router';

import { ProductDetailsPageComponent } from './pages/product-details-page/product-details-page.component';
import { ProductsOverviewPageComponent } from './pages/products-overview-page/products-overview-page.component';
import { BuildWithAiPageComponent } from './pages/build-with-ai-page/build-with-ai-page.component';

export const appRoutes: Routes = [
  {
    path: 'build-with-ai',
    component: BuildWithAiPageComponent
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
    redirectTo: ''
  }
];
