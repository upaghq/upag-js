export type Env = 'sandbox' | 'production';

export interface InitConfig {
  token: string;
  env: Env;
}

export interface CardInput {
  number: string;
  expiration_date: string;
  cvv: string;
  holder_name: string;
}

export interface CustomerInput {
  name: string;
  document_number: string;
  email: string;
  phone: {
    number: string;
    area_code: string;
    country_code: string;
  };
  address: {
    country: string;
    state: string;
    city: string;
    neighborhood: string;
    number: string;
    street: string;
    zipcode: string;
    complement?: string;
  };
}

export interface ParsedAuthenticate {
  challenge?: boolean;
  amount: number;
  soft_descriptor_challenge?: string;
  card_id?: string;
  card_hash?: string;
  card?: CardInput;
  customer: CustomerInput;
}

export interface SetupResponse {
  card_id: string;
  access_token: string;
  data_collection_url: string;
  session_id: string;
}

export interface AuthenticateResponse {
  authentication_id: string;
  challenge?: {
    url: string;
    access_token: string;
    window_size: string;
  } | null;
}
