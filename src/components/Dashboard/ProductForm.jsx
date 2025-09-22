// components/Dashboard/ProductManagement/ProductForm.jsx
import React, { useState } from 'react';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ProductForm = ({ product, onSave }) => {
  const [formData, setFormData] = useState(product || {
    name: '',
    cost: 0,
    price: 0,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    // Save product via API
    onSave(formData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Input
        label="Product Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
      />
      <Input
        label="Cost Price"
        name="cost"
        type="number"
        value={formData.cost}
        onChange={handleChange}
        required
      />
      <Input
        label="Selling Price"
        name="price"
        type="number"
        value={formData.price}
        onChange={handleChange}
        required
      />
      <Button type="submit" variant="primary">Save</Button>
    </Form>
  );
};

export default ProductForm;