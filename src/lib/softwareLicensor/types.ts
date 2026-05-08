export type ApiRequest =
  | {
      action: "CreateLicense";
      data: {
        customer_first_name: string;
        customer_last_name: string;
        customer_email: string;
        order_id: string;
        custom_success_message: string;
        license_requests: CreateLicenseRequestJson[];
      };
    }
  | {
      action: "CreateOrUpdateProduct";
      data: {
        is_offline_allowed: boolean;
        max_machines: number;
        product_id_or_prefix: string;
        product_name: string;
        product_version: string;
      };
    }
  | { action: "GetLicense" }
  | { action: "RegenerateLicense" }
  | {
      action: "RegisterStore";
      data: {
        store_id: string;
      };
    }
  | { action: "FetchStoredProductData" };

export type CreateLicenseRequestJson = {
  product_id: string;
  license_type: "perpetual" | "trial" | "subscription";
  quantity: number;
};

export type Machine = {
  id: string;
  os: string;
  computer_name: string;
};

export type LicenseInfo = {
  license_type: string;
  expiration_or_renewal: string;
  offline_machines: Machine[];
  online_machines: Machine[];
  machine_limit: number;
};

export type LicenseResponse = {
  license_code: string;
  offline_code?: string;
  licensed_products: Record<string, LicenseInfo>;
  license_issues?: Record<string, string>;
};

export type ProductInfo = {
  is_offline_allowed: boolean;
  version: string;
  max_machines_per_license: number;
  product_name: string;
  public_key: string;
};

export type StoredProductData = {
  store_id: string;
  products: Record<string, ProductInfo>;
};

export type CreateOrUpdateProductResponse = {
  product_id: string;
  product_pubkey: string;
};

export type RegisterStoreResponse = {
  store_id: string;
};