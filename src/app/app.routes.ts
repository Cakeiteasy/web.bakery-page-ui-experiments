import { Routes } from '@angular/router';

import { ProductDetailsPageComponent } from './pages/product-details-page/product-details-page.component';
import { ProductsOverviewPageComponent } from './pages/products-overview-page/products-overview-page.component';

export const appRoutes: Routes = [
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
