   // src/utils/api.ts
   export const fetchKPIs = async () => {
    const response = await fetch('/api/kpis');
    if (!response.ok) {
      throw new Error('Failed to fetch KPIs');
    }
    return response.json();
  };

  export const fetchPendingSchools = async () => {
    const response = await fetch('/api/pending-schools');
    if (!response.ok) {
      throw new Error('Failed to fetch pending schools');
    }
    return response.json();
  };

  export const fetchSalesData = async () => {
    const response = await fetch('/api/sales-data');
    if (!response.ok) {
      throw new Error('Failed to fetch sales data');
    }
    return response.json();
  };

  export const fetchDeliveries = async () => {
    const response = await fetch('/api/deliveries');
    if (!response.ok) {
      throw new Error('Failed to fetch deliveries');
    }
    return response.json();
  };

  export const fetchObjectives = async () => {
    const response = await fetch('/api/objectives');
    if (!response.ok) {
      throw new Error('Failed to fetch objectives');
    }
    return response.json();
  };

  export const approveSchool = async (schoolId: string) => {
    const response = await fetch('/api/approve-school', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to approve school');
    }
    return response.json();
  };

  export const rejectSchool = async (schoolId: string) => {
    const response = await fetch('/api/reject-school', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to reject school');
    }
    return response.json();
  };

  export const generateDeliveryReport = async () => {
    const response = await fetch('/api/generate-delivery-report', {
      method: 'POST',
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate delivery report');
    }
    // Assuming the backend sends the PDF as a blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'delivery_report.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  };