export type AffiliateBankOption = {
  type: number;
  name: string;
};

export type CreateAffiliateBankResponse = {
  statusCode?: number | string;
  code?: number | string;
  message?: string;
  data?: unknown;
};
