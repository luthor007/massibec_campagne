# Product Ordering Feature - Complete Guide

## ✅ **Implemented Features**

### 1. **Database Schema Changes** (`src/models/Product.js`)

- ✅ Added `order` field (Number, default: 0)
- ✅ Added timestamps for tracking creation/updates
- ✅ Order field is automatically initialized for existing products

### 2. **API Enhancements**

#### **Products Index API** (`src/pages/api/products/index.js`)

- ✅ Sorts products by `order` field (ascending)
- ✅ Returns `order` field in all product responses
- ✅ New products get `order = lastProduct + 1`

#### **Products Individual API** (`src/pages/api/products/[id].js`)

- ✅ Returns `order` field in GET responses
- ✅ Includes `order` in PUT responses

#### **New Reorder API** (`src/pages/api/products/reorder.js`)

- ✅ Endpoint: `PUT /api/products/reorder`
- ✅ Accepts array of products with their new orders
- ✅ Bulk updates all product orders efficiently
- ✅ Returns success message with count

### 3. **Frontend Implementation**

#### **ProductList Component** (`src/components/Dashboard/ProductManagement/ProductList.jsx`)

- ✅ **Drag-and-drop functionality** using framer-motion Reorder
- ✅ **Order column** displays current position (1, 2, 3, etc.)
- ✅ **Grip icon** (⋮⋮) to indicate draggable rows
- ✅ **Auto-saves** order changes to database
- ✅ **Visual feedback** during drag (scale + z-index)
- ✅ **Error handling** with toast notifications
- ✅ **State recovery** if save fails

#### **Main Products Page** (`src/pages/dashboard-massibec/products/index.jsx`)

- ✅ **Order column** displays in table
- ✅ **Displays position** (1, 2, 3, etc.)
- ✅ **Sorted by order** field automatically
- ✅ Ready for future drag-and-drop implementation

### 4. **Database Migration**

- ✅ Script: `scripts/initialize-product-order.js`
- ✅ Initialized order for all 11 existing products
- ✅ Can be run anytime to fix order values

## 🎯 **How It Works**

### **Display Order**

Products are now displayed in a specific order controlled by the `order` field:

```javascript
// In API
.sort({ order: 1, createdAt: -1 })

// In Frontend
.sort((a, b) => (a.order || 0) - (b.order || 0))
```

### **Drag and Drop**

Users can drag products in the ProductList component:

1. Click and drag the grip icon (⋮⋮)
2. Drop in new position
3. Order automatically saved to database
4. Toast notification confirms save

### **Boutique Display**

The order set in Product Management is the same order displayed in:

- School boutiques
- Product listings
- Anywhere products are shown

## 📝 **API Endpoints**

### Get Products (with order)

```javascript
GET /api/products?limit=100
Response: {
  products: [
    { id, name, description, price, cost, image, productId, order: 0, ... },
    { id, name, description, price, cost, image, productId, order: 1, ... },
    ...
  ]
}
```

### Update Product Order

```javascript
PUT /api/products/reorder
Body: {
  products: [
    { id: "product1", order: 0 },
    { id: "product2", order: 1 },
    ...
  ]
}
```

## 🎨 **User Interface**

### **Order Column**

- Shows grip icon (⋮⋮) + position number (1, 2, 3...)
- Grip icon indicates the row is draggable
- Position number shows current display order

### **Visual Feedback**

- Row scales up slightly when dragging
- Z-index elevated during drag
- Smooth animations via framer-motion
- Toast notifications for success/error

## 🔄 **Next Steps for Full Implementation**

If you want drag-and-drop in the main products page:

1. Implement a custom drag-handle component
2. Use mouse events instead of Reorder components
3. Or keep drag-and-drop only in ProductList (current approach)

## ✅ **What's Working Now**

- ✅ Products have order field
- ✅ Products sorted by order
- ✅ Order column visible
- ✅ Drag-and-drop in ProductList works
- ✅ Changes save to database
- ✅ Boutique displays products in same order
