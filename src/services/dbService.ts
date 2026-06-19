/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DepartmentMaster, CustomerMaster, ProductMaster } from '../types';

/**
 * Data Service Abstraction for Master Data management.
 * Encapsulating storage mechanics so they can be seamlessly swapped (e.g. LocalStorage -> Google Sheets API) in the future.
 */
export interface IMasterDataService {
  getDepartments(): Promise<DepartmentMaster[]>;
  saveDepartments(data: DepartmentMaster[]): Promise<void>;
  clearDepartments(): Promise<void>;

  getCustomers(): Promise<CustomerMaster[]>;
  saveCustomers(data: CustomerMaster[]): Promise<void>;
  clearCustomers(): Promise<void>;

  getProducts(): Promise<ProductMaster[]>;
  saveProducts(data: ProductMaster[]): Promise<void>;
  clearProducts(): Promise<void>;
}

class LocalStorageMasterDataService implements IMasterDataService {
  private KEYS = {
    DEPARTMENTS: 'master_departments',
    CUSTOMERS: 'master_customers',
    PRODUCTS: 'master_products',
  };

  async getDepartments(): Promise<DepartmentMaster[]> {
    const raw = localStorage.getItem(this.KEYS.DEPARTMENTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async saveDepartments(data: DepartmentMaster[]): Promise<void> {
    localStorage.setItem(this.KEYS.DEPARTMENTS, JSON.stringify(data));
  }

  async clearDepartments(): Promise<void> {
    localStorage.removeItem(this.KEYS.DEPARTMENTS);
  }

  async getCustomers(): Promise<CustomerMaster[]> {
    const raw = localStorage.getItem(this.KEYS.CUSTOMERS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async saveCustomers(data: CustomerMaster[]): Promise<void> {
    localStorage.setItem(this.KEYS.CUSTOMERS, JSON.stringify(data));
  }

  async clearCustomers(): Promise<void> {
    localStorage.removeItem(this.KEYS.CUSTOMERS);
  }

  async getProducts(): Promise<ProductMaster[]> {
    const raw = localStorage.getItem(this.KEYS.PRODUCTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async saveProducts(data: ProductMaster[]): Promise<void> {
    localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify(data));
  }

  async clearProducts(): Promise<void> {
    localStorage.removeItem(this.KEYS.PRODUCTS);
  }
}

export const dbService: IMasterDataService = new LocalStorageMasterDataService();
