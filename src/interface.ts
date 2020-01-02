
export interface IObjectIndexer<T> {
    [id: string]: T;
}

export interface IObject extends IObjectIndexer<any> {}
