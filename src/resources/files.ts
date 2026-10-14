import { BaseResource } from './base-resource';
import { HttpClient } from '../utils/http-client';
import { CreateFileParams, UpagFile } from '../types';

export class Files extends BaseResource {
  constructor(http: HttpClient) {
    super(http, '/files');
  }

  /**
   * Uploads a file (`multipart/form-data`). Returns the file with its `url` when its purpose is public.
   *
   * A public key can upload public purposes only (`business_icon`, `business_logo`, `product_image`,
   * `user_profile_picture`, `checkout_asset`). Private purposes need your secret key, so upload those
   * from your server.
   */
  async create(params: CreateFileParams): Promise<UpagFile> {
    const form = new FormData();
    if (typeof File !== 'undefined' && params.file instanceof File) {
      form.append('file', params.file, params.file.name);
    } else {
      form.append('file', params.file);
    }
    form.append('purpose', params.purpose);
    if (params.name !== undefined) {
      form.append('name', params.name);
    }

    return this.http.post<UpagFile>(this.basePath, form);
  }
}
