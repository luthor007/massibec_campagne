// components/Dashboard/Settings/Settings.jsx
import React, { useState } from 'react';
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const Settings = () => {
  const [settings, setSettings] = useState({
    organizationName: '',
    contactEmail: '',
    defaultLanguage: 'en',
  });

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    // Save settings via API
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Settings</h2>
      <Form onSubmit={handleSubmit}>
        <Input
          label="Organization Name"
          name="organizationName"
          value={settings.organizationName}
          onChange={handleChange}
          required
        />
        <Input
          label="Contact Email"
          name="contactEmail"
          type="email"
          value={settings.contactEmail}
          onChange={handleChange}
          required
        />
        <Input
          label="Default Language"
          name="defaultLanguage"
          value={settings.defaultLanguage}
          onChange={handleChange}
          required
        />
        <Button type="submit" variant="primary">Save Settings</Button>
      </Form>
    </div>
  );
};

export default Settings;