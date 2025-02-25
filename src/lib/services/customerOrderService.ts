import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { AuthResponse } from '@supabase/supabase-js';

const supabase = createClientComponentClient();

export interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
  returned: number;
}

export interface OrderSummary {
  id: string;
  created_at: string;
  user_id: string;
  user_details: {
    full_name: string;
    email: string;
    phone: string;
  };
  total_amount: number;
  payment_status: string;
  payment_method: string;
  status: string;
  shipping_address: any;
  items: Array<{
    product: {
      title: string;
      price: number;
    };
    quantity: number;
    customization?: any;
  }>;
}

class CustomerOrderService {
  async getOrderStats(): Promise<OrderStats> {
    try {
      const { data: orders, error } = await supabase.from('orders').select('*'); // Select all columns to ensure we get the data

      if (error) {
        console.error('Error fetching order stats:', error);
        throw error;
      }

      console.log('Orders data:', orders);

      const stats = orders?.reduce(
        (acc, order) => {
          acc.total++;
          const status = order.status?.toLowerCase() || 'pending';
          if (acc.hasOwnProperty(status)) {
            acc[status as keyof Omit<OrderStats, 'total'>]++;
          }
          return acc;
        },
        {
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          cancelled: 0,
          returned: 0
        }
      ) || {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
        returned: 0
      };

      return stats;
    } catch (error) {
      console.error('Error in getOrderStats:', error);
      throw error;
    }
  }

  async getOrders(filters?: {
    status?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<OrderSummary[]> {
    try {
      let query = supabase.from('orders').select(`
        *,
        profiles!orders_user_id_fkey (
          full_name,
          email,
          phone
        ),
        order_items (
          quantity,
          customization,
          products!order_items_product_id_fkey (
            title,
            price
          )
        )
      `);

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.search) {
        query = query.or(
          `profiles.full_name.ilike.%${filters.search}%,id.eq.${filters.search}`
        );
      }

      const { data, error } = await query.order('created_at', {
        ascending: false
      });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      console.log('Orders fetched:', data);

      return data || [];
    } catch (error) {
      console.error('Error in getOrders:', error);
      throw error;
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    reason?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        status,
        status_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) throw error;
  }

  async getOrderDetails(orderId: string): Promise<OrderSummary> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          profiles!orders_user_id_fkey (
            full_name,
            email,
            phone
          ),
          order_items (
            quantity,
            customization,
            products!order_items_product_id_fkey (
              title,
              price
            )
          )
        `
        )
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error fetching order details:', error);
        throw error;
      }

      console.log('Order details:', data);

      return data;
    } catch (error) {
      console.error('Error in getOrderDetails:', error);
      throw error;
    }
  }

  async getOrderAnalytics(period: 'day' | 'week' | 'month' = 'month') {
    const { data, error } = await supabase
      .from('orders')
      .select('created_at, total_amount, status')
      .gte(
        'created_at',
        new Date(
          Date.now() -
            (period === 'day' ? 1 : period === 'week' ? 7 : 30) *
              24 *
              60 *
              60 *
              1000
        ).toISOString()
      );

    if (error) throw error;
    return data;
  }
}

export const customerOrderService = new CustomerOrderService();
