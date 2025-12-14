import type { IApi, IData } from '@interface/IApi';

class ApiService implements IApi {
  constructor() {
    console.log('Apiservice constructor');
  }
  getInfo(): Promise<IData> {
    return Promise.resolve({ item: 'test', result: [1, 2, 3] });
  }
}

export default ApiService;
