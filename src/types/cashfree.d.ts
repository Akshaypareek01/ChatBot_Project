interface CashfreeCheckoutOptions {
    paymentSessionId?: string;
    orderToken?: string;
    orderAmount?: number;
    orderId?: string;
    orderCurrency?: string;
    redirectTarget?: '_self' | '_blank' | '_top' | '_modal' | HTMLElement;
    onSuccess?: (data: any) => void;
    onFailure?: (data: any) => void;
  }
  
  interface CashfreeInitOptions {
    mode: 'sandbox' | 'production';
  }
  
  interface Cashfree {
    checkout(options: CashfreeCheckoutOptions): Promise<any>;
  }
  
  declare function Cashfree(options: CashfreeInitOptions): Cashfree;
  
  interface Window {
    Cashfree: typeof Cashfree;
  }
  