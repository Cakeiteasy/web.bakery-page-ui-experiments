import { Routes } from '@angular/router';

import { BuildWithAiPageComponent } from './pages/build-with-ai-page/build-with-ai-page.component';
import { PagesListComponent } from './pages/pages-list/pages-list.component';
import { DynamicPageViewComponent } from './pages/dynamic-page-view/dynamic-page-view.component';
import { AdminAiLogsComponent } from './pages/admin-ai-logs/admin-ai-logs.component';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'pages', pathMatch: 'full' },
  { path: 'pages', component: PagesListComponent },
  { path: 'pages/:pageId', component: BuildWithAiPageComponent },
  { path: 'admin/ai-logs', component: AdminAiLogsComponent },
  { path: '**', component: DynamicPageViewComponent }
];
