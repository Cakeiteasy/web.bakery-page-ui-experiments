import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dynamic-page-view',
  standalone: true,
  imports: [],
  template: ''
})
export class DynamicPageViewComponent implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    const slug = this.router.url.replace(/^\//, '').split('?')[0];
    if (slug) {
      window.location.href = `/api/page-renderer?slug=${encodeURIComponent(slug)}`;
    } else {
      this.router.navigateByUrl('/');
    }
  }
}
