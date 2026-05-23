export interface User {
    id: number,
    name: string,
    email: string,
    password: string,
    role: string,
    created_at: string,
    updated_at: string
}

export type RUser = Omit<User, 'id' | 'password' | 'created_at' | 'updated_at'>


export const User_Role = {
    contributor: "contributor", 
    maintainer: "maintainer"
}
export type Role = "contributor" | "maintainer"