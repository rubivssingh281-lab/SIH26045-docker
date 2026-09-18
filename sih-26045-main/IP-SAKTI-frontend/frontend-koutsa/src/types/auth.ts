export interface AuthUser {
  id?: string;
  email: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  default_jurisdiction?: "INDIA" | "INTERNATIONAL";
}

export interface AuthResponse {
  access_token: string;
  token_type?: string;
  user?: AuthUser;
  requires_otp?: boolean;
  message?: string;
}
