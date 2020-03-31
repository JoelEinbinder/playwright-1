/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { Page } from './page';
import { Events } from './events';
import { Readable } from 'stream';

export class Download {
  private _downloadsPath: string;
  private _uuid: string;
  private _finishedCallback: () => void;
  private _finishedPromise: Promise<void>;
  private _page: Page;
  private _acceptDownloads: boolean;
  private _error: string | null = null;
  private _deleted = false;

  constructor(page: Page, downloadsPath: string, uuid: string) {
    this._page = page;
    this._downloadsPath = downloadsPath;
    this._uuid = uuid;
    this._finishedCallback = () => {};
    this._finishedPromise = new Promise(f => this._finishedCallback = f);
    this._page.emit(Events.Page.Download, this);
    page._browserContext._downloads.add(this);
    this._acceptDownloads = !!this._page._browserContext._options.acceptDownloads;
  }

  async path(): Promise<string | null> {
    if (!this._acceptDownloads)
      throw new Error('Pass { acceptDownloads: true } when you are creating your browser context.');
    const fileName = path.join(this._downloadsPath, this._uuid);
    await this._finishedPromise;
    if (this._error)
      return null;
    return fileName;
  }

  async error(): Promise<string | null> {
    if (!this._acceptDownloads)
      throw new Error('Pass { acceptDownloads: true } when you are creating your browser context.');
    await this._finishedPromise;
    return this._error;
  }

  async createReadStream(): Promise<Readable | null> {
    const fileName = await this.path();
    return fileName ? fs.createReadStream(fileName) : null;
  }

  async delete(): Promise<void> {
    if (!this._acceptDownloads || this._deleted)
      return;
    const fileName = await this.path();
    this._deleted = true;
    if (fileName)
      await util.promisify(fs.unlink)(fileName);
  }

  _reportFinished(error: string) {
    this._error = error || null;
    this._finishedCallback();
  }
}
