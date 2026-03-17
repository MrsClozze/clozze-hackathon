/// <reference types="vite/client" />

interface DSDigitalSignupInterface {
  startSignup(
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    partnerIK: string,
    loginRedirectUri: string,
    locale?: string
  ): void;
  viewPlans(): void;
}

declare const DSDigitalSignup: DSDigitalSignupInterface;
