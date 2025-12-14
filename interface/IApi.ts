export type IData = {
  item: string;
  result?: Array<number | string>;
};

export interface IApi {
  getInfo(): Promise<IData>;
}
