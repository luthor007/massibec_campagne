// types/store.ts

export interface IUser {
    _id: string;
    // Ajoutez d'autres champs si nécessaire
  }
  
  export interface IStore {
    _id: string;
    user: IUser;
    name: string;
    // Ajoutez d'autres champs si nécessaire
  }