import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BuildWithAiApiRequest, BuildWithAiApiResponse } from '../models/build-with-ai.model';

@Injectable({ providedIn: 'root' })
export class BuildWithAiApiService {
  private readonly http = inject(HttpClient);

  async requestPatch(payload: BuildWithAiApiRequest, demoKey?: string): Promise<BuildWithAiApiResponse> {
    const key = demoKey?.trim();
    const headers = key
      ? new HttpHeaders({
          'x-demo-key': key
        })
      : undefined;

    return firstValueFrom(
      this.http.post<BuildWithAiApiResponse>('/api/build-with-ai', payload, {
        headers
      })
    );
  }
}
