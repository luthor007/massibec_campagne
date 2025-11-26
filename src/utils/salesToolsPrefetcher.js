let salesToolsPrefetchPromise = null;

export const prefetchSalesTools = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (salesToolsPrefetchPromise) {
    return salesToolsPrefetchPromise;
  }

  salesToolsPrefetchPromise = Promise.all([
    import('../components/SalesTools/PDFGenerator'),
    import('../components/SalesTools/QRCodeGenerator'),
    import('../components/SalesTools/ClientManager'),
    import('../components/SalesTools/EmailCampaign')
  ]).catch((error) => {
    console.warn('[prefetchSalesTools] Unable to preload sales tools:', error);
    salesToolsPrefetchPromise = null;
  });

  return salesToolsPrefetchPromise;
};
