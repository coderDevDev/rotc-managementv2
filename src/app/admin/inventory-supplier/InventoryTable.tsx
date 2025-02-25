'use client';

import { useState } from 'react';
import type { InventoryItem, Supplier } from '@/types/inventory.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Edit,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Trash2
} from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import UpdateInventoryForm from './UpdateInventoryForm';
import { toast } from 'sonner';
import ProductModal from '@/components/admin/products/ProductModal';

import { productService } from '@/services/productService';
interface InventoryTableProps {
  products: InventoryItem[];
  suppliers: Supplier[];
  onUpdate: (id: string, data: Partial<InventoryItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAdd: (
    data: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<void>;
  fetchProducts: () => Promise<void>;
}

export default function InventoryTable({
  products,
  suppliers,
  onUpdate,
  onDelete,
  onAdd,
  fetchProducts
}: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 8;

  // Filter products based on search term
  const filteredProducts = products.filter(product => {
    const searchString = `${product.title} ${product.category}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStockStatus = (quantity: number) => {
    if (quantity === 0)
      return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>;
    if (quantity <= 10)
      return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handleEdit = (product: InventoryItem) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setIsLoading(true);
      await onDelete(id);
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (
    data: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      setIsLoading(true);
      await onAdd(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (data: Partial<InventoryItem>) => {
    try {
      setIsLoading(true);
      await onUpdate(selectedProduct?.id || '', data);
      toast.success('Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      if (productData.id) {
        // Update existing product
        await productService.updateProduct(productData.id, productData);
        toast.success('Product updated successfully');
      } else {
        // Create new product without ID (will be generated in service)
        const { id, ...newProductData } = productData;
        await productService.createProduct(newProductData);
        toast.success('Product created successfully');
      }

      // Refresh product list
      fetchProducts();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save product'
      );
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 transition-all duration-200"
          />
        </div>
        <Button
          onClick={() => {
            setSelectedProduct(null);
            setIsModalOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Product</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Price</TableHead>
                <TableHead className="font-semibold">Stock</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {product.srcurl && (
                        <img
                          src={product.srcurl}
                          alt={product.title}
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      )}
                      {product.title}
                    </div>
                  </TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>₱{product.price}</TableCell>
                  <TableCell>{product.stock || 0}</TableCell>
                  <TableCell>{getStockStatus(product.stock || 0)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Edit className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        onSave={handleSaveProduct}
        product={selectedProduct}
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
          {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of{' '}
          {filteredProducts.length} entries
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex gap-1">
            {getPageNumbers().map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                className="w-8 bg-primary hover:bg-primary/90 text-white"
                onClick={() => setCurrentPage(page)}>
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
