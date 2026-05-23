export interface responseType<T> {
    statusCode: number,
    success: boolean,
    message: string,
    data?: T,
    error?: any
}