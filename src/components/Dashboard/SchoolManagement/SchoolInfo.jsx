'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().split('T')[0];
};

const formatDisplayDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }
  return date.toLocaleDateString();
};

const createTempId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getNextCampaignNumber = (campaigns) => {
  const parsedNumbers = campaigns
    .map((campaign) => Number(campaign.campaignNumber))
    .filter((value) => Number.isFinite(value));

  if (!parsedNumbers.length) {
    return 1;
  }

  return Math.max(...parsedNumbers) + 1;
};

const normalizeCampaigns = (school) => {
  const sourceCampaigns = Array.isArray(school.campaigns) && school.campaigns.length > 0
    ? school.campaigns
    : [{
        _id: school.activeCampaignId ?? undefined,
        campaignNumber: school.currentCampaignNumber ?? 1,
        startDate: school.debutCampagne,
        endDate: school.finCampagne,
        deliveryDate: school.dateDeLivraison,
        isActive: true,
        notes: '',
      }];

  const normalized = sourceCampaigns.map((campaign, index) => {
    const documentId = campaign._id ? campaign._id.toString() : null;

    return {
      id: documentId || createTempId(),
      documentId,
      campaignNumber: campaign.campaignNumber != null
        ? String(campaign.campaignNumber)
        : String(index + 1),
      startDate: toDateInputValue(campaign.startDate ?? school.debutCampagne),
      endDate: toDateInputValue(campaign.endDate ?? school.finCampagne),
      deliveryDate: toDateInputValue(campaign.deliveryDate ?? school.dateDeLivraison),
      isActive: Boolean(campaign.isActive) || (
        school.activeCampaignId && documentId && school.activeCampaignId.toString() === documentId
      ),
      notes: campaign.notes || '',
    };
  });

  if (!normalized.some((campaign) => campaign.isActive) && normalized.length > 0) {
    normalized[0].isActive = true;
  }

  return normalized;
};

const applyActiveCampaign = (campaigns, activeId) => campaigns.map((campaign) => ({
  ...campaign,
  isActive: campaign.id === activeId,
}));

const SchoolInfo = ({ school }) => {
  const { toast } = useToast();
  const [currentSchool, setCurrentSchool] = useState(school);
  const initialCampaigns = useMemo(() => normalizeCampaigns(school), [school]);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [activeCampaignId, setActiveCampaignId] = useState(() => {
    const activeCampaign = initialCampaigns.find((campaign) => campaign.isActive) || initialCampaigns[0];
    return activeCampaign ? activeCampaign.id : null;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');

  const [formData, setFormData] = useState({
    name: school.name || '',
    address: school.address || '',
    objectifFinancier: school.objectifFinancier || '',
    telephone: school.telephone || '',
    email: school.email || '',
    accumba: school.accumba || '',
    expNum: school.expNum || '',
    split: school.split || { studentBenefit: 85.6, organizationBenefit: 9.4, raffleBenefit: 5.0 },
    isBonus: school.isBonus || false,
    customFields: school.customFields || {},
  });

  useEffect(() => {
    setFormData({
      name: currentSchool.name || '',
      address: currentSchool.address || '',
      objectifFinancier: currentSchool.objectifFinancier || '',
      telephone: currentSchool.telephone || '',
      email: currentSchool.email || '',
      accumba: currentSchool.accumba || '',
      expNum: currentSchool.expNum || '',
      split: currentSchool.split || { studentBenefit: 85.6, organizationBenefit: 9.4, raffleBenefit: 5.0 },
      isBonus: currentSchool.isBonus || false,
      customFields: currentSchool.customFields || {},
    });

    const refreshedCampaigns = normalizeCampaigns(currentSchool);
    const active = refreshedCampaigns.find((campaign) => campaign.isActive) || refreshedCampaigns[0];
    const activeId = active ? active.id : null;
    setCampaigns(applyActiveCampaign(refreshedCampaigns, activeId));
    setActiveCampaignId(activeId);
  }, [currentSchool]);

  useEffect(() => {
    if (!campaigns.length) {
      setActiveCampaignId(null);
      return;
    }

    if (!campaigns.some((campaign) => campaign.id === activeCampaignId)) {
      const fallback = campaigns[0];
      setActiveCampaignId(fallback.id);
      setCampaigns(applyActiveCampaign(campaigns, fallback.id));
    }
  }, [campaigns, activeCampaignId]);

  const activeCampaign = useMemo(() => {
    if (!campaigns.length) {
      return null;
    }
    return campaigns.find((campaign) => campaign.id === activeCampaignId) || campaigns[0];
  }, [campaigns, activeCampaignId]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name in formData.split) {
      setFormData((prev) => ({
        ...prev,
        split: {
          ...prev.split,
          [name]: Number(value),
        },
      }));
      return;
    }

    if (name.startsWith('custom_')) {
      const fieldName = name.replace('custom_', '');
      setFormData((prev) => ({
        ...prev,
        customFields: {
          ...prev.customFields,
          [fieldName]: value,
        },
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCampaignFieldChange = (campaignId, field, value) => {
    setCampaigns((prevCampaigns) => prevCampaigns.map((campaign) => (
      campaign.id === campaignId
        ? { ...campaign, [field]: value }
        : campaign
    )));
  };

  const handleAddCampaign = () => {
    const nextNumber = getNextCampaignNumber(campaigns);
    const newCampaign = {
      id: createTempId(),
      documentId: null,
      campaignNumber: String(nextNumber),
      startDate: '',
      endDate: '',
      deliveryDate: '',
      isActive: campaigns.length === 0,
      notes: '',
    };

    const updatedCampaigns = [...campaigns, newCampaign];
    const activeId = campaigns.length === 0 ? newCampaign.id : activeCampaignId;
    setCampaigns(applyActiveCampaign(updatedCampaigns, activeId));
    setActiveCampaignId(activeId);
  };

  const handleRemoveCampaign = (campaignId) => {
    if (campaigns.length <= 1) {
      toast({
        title: 'Impossible de supprimer',
        description: 'Au moins une campagne doit rester associée à l’école.',
        variant: 'destructive',
      });
      return;
    }

    const filteredCampaigns = campaigns.filter((campaign) => campaign.id !== campaignId);
    const nextActive = campaignId === activeCampaignId
      ? filteredCampaigns[0]?.id || null
      : activeCampaignId;

    setCampaigns(applyActiveCampaign(filteredCampaigns, nextActive));
    setActiveCampaignId(nextActive);
  };

  const handleSetActiveCampaign = (campaignId) => {
    setActiveCampaignId(campaignId);
    setCampaigns((prevCampaigns) => applyActiveCampaign(prevCampaigns, campaignId));
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;

    setFormData((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [newFieldName]: '',
      },
    }));
    setNewFieldName('');
  };

  const removeCustomField = (fieldName) => {
    setFormData((prev) => {
      const newCustomFields = { ...prev.customFields };
      delete newCustomFields[fieldName];
      return {
        ...prev,
        customFields: newCustomFields,
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!campaigns.length) {
      toast({
        title: 'Erreur',
        description: 'Veuillez ajouter au moins une campagne.',
        variant: 'destructive',
      });
      return;
    }

    const active = campaigns.find((campaign) => campaign.id === activeCampaignId);

    if (!active) {
      toast({
        title: 'Erreur',
        description: 'Sélectionnez une campagne active avant de sauvegarder.',
        variant: 'destructive',
      });
      return;
    }

    const hasMissingFields = campaigns.some((campaign) => (
      !campaign.campaignNumber || !campaign.startDate || !campaign.endDate
    ));

    if (hasMissingFields) {
      toast({
        title: 'Champs manquants',
        description: 'Chaque campagne doit avoir un numéro, une date de début et une date de fin.',
        variant: 'destructive',
      });
      return;
    }

    const payloadCampaigns = campaigns.map((campaign) => ({
      _id: campaign.documentId || undefined,
      campaignNumber: Number(campaign.campaignNumber),
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      deliveryDate: campaign.deliveryDate || null,
      isActive: campaign.id === activeCampaignId,
      notes: campaign.notes?.trim() ? campaign.notes : undefined,
    }));

    const payload = {
      ...formData,
      campaigns: payloadCampaigns,
    };

    try {
      const response = await fetch(`/api/schools/${school._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update school information.');
      }

      const updatedSchool = await response.json();
      setCurrentSchool(updatedSchool);
      setIsEditing(false);
      toast({
        title: 'Succès',
        description: 'Les informations de l’école ont été mises à jour.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 bg-white shadow rounded-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">School Information</h3>
        <Button variant="outline" onClick={() => setIsEditing((value) => !value)}>
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">School Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="telephone">Telephone</Label>
              <Input
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="objectifFinancier">Financial Objective</Label>
              <Input
                id="objectifFinancier"
                name="objectifFinancier"
                value={formData.objectifFinancier}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="accumba">Accumba Number</Label>
              <Input
                id="accumba"
                name="accumba"
                value={formData.accumba}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="expNum">Exp Number</Label>
              <Input
                id="expNum"
                name="expNum"
                value={formData.expNum}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isBonus"
                checked={formData.isBonus}
                onCheckedChange={(checked) => {
                  setFormData((prev) => ({
                    ...prev,
                    isBonus: Boolean(checked),
                  }));
                }}
              />
              <Label htmlFor="isBonus">Enable Bonus System</Label>
            </div>
          </div>

          <div>
            <h4 className="font-semibold">Campaigns</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Gérez les périodes de campagne de l’école et choisissez laquelle est active.
            </p>
            <div className="space-y-4">
              {campaigns.map((campaign, index) => (
                <div key={campaign.id} className="border rounded-md p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold">
                      Campagne #{campaign.campaignNumber || index + 1}
                    </h5>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="radio"
                          name="activeCampaign"
                          value={campaign.id}
                          checked={campaign.id === activeCampaignId}
                          onChange={() => handleSetActiveCampaign(campaign.id)}
                        />
                        <span>Active</span>
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCampaign(campaign.id)}
                        aria-label="Remove campaign"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>Campaign Number</Label>
                      <Input
                        type="number"
                        min={1}
                        value={campaign.campaignNumber}
                        onChange={(event) =>
                          handleCampaignFieldChange(campaign.id, 'campaignNumber', event.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={campaign.startDate}
                        onChange={(event) =>
                          handleCampaignFieldChange(campaign.id, 'startDate', event.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={campaign.endDate}
                        onChange={(event) =>
                          handleCampaignFieldChange(campaign.id, 'endDate', event.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Delivery Date</Label>
                      <Input
                        type="date"
                        value={campaign.deliveryDate}
                        onChange={(event) =>
                          handleCampaignFieldChange(campaign.id, 'deliveryDate', event.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={campaign.notes}
                      onChange={(event) =>
                        handleCampaignFieldChange(campaign.id, 'notes', event.target.value)
                      }
                      placeholder="Commentaires internes (optionnel)"
                    />
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={handleAddCampaign}>
                Ajouter une campagne
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold">Split Configuration (%)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div>
                <Label htmlFor="studentBenefit">Student Benefit</Label>
                <Input
                  id="studentBenefit"
                  name="studentBenefit"
                  type="number"
                  value={formData.split.studentBenefit}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  required
                />
              </div>
              <div>
                <Label htmlFor="organizationBenefit">Organization Benefit</Label>
                <Input
                  id="organizationBenefit"
                  name="organizationBenefit"
                  type="number"
                  value={formData.split.organizationBenefit}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  required
                />
              </div>
              <div>
                <Label htmlFor="raffleBenefit">Raffle Benefit</Label>
                <Input
                  id="raffleBenefit"
                  name="raffleBenefit"
                  type="number"
                  value={formData.split.raffleBenefit}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Custom Fields</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="New field name"
                  value={newFieldName}
                  onChange={(event) => setNewFieldName(event.target.value)}
                  className="w-48"
                />
                <Button
                  type="button"
                  onClick={addCustomField}
                  variant="outline"
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {Object.entries(formData.customFields).map(([fieldName, value]) => (
                <div key={fieldName} className="flex gap-2">
                  <div className="flex-grow">
                    <Label htmlFor={`custom_${fieldName}`}>{fieldName}</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`custom_${fieldName}`}
                        name={`custom_${fieldName}`}
                        value={value}
                        onChange={handleChange}
                      />
                      <Button
                        type="button"
                        onClick={() => removeCustomField(fieldName)}
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit">Save Changes</Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">Basic Information</h4>
              <p><strong>Name:</strong> {currentSchool.name}</p>
              <p><strong>Email:</strong> {currentSchool.email}</p>
              <p><strong>Telephone:</strong> {currentSchool.telephone}</p>
              <p><strong>Address:</strong> {currentSchool.address}</p>
            </div>

            <div>
              <h4 className="font-semibold">Campaign Details</h4>
              <p><strong>Campaign Number:</strong> {currentSchool.currentCampaignNumber ?? 'N/A'}</p>
              <p><strong>Campaign Start:</strong> {formatDisplayDate(currentSchool.debutCampagne)}</p>
              <p><strong>Campaign End:</strong> {formatDisplayDate(currentSchool.finCampagne)}</p>
              <p><strong>Delivery Date:</strong> {formatDisplayDate(currentSchool.dateDeLivraison)}</p>
            </div>

            <div>
              <h4 className="font-semibold">EDI Information</h4>
              <p><strong>Accumba Number:</strong> {currentSchool.accumba || 'Not set'}</p>
              <p><strong>Exp Number:</strong> {currentSchool.expNum || 'Not set'}</p>
              <p><strong>Bonus System:</strong> {currentSchool.isBonus ? 'Enabled' : 'Disabled'}</p>
            </div>

            <div>
              <h4 className="font-semibold">Split Configuration (%)</h4>
              <p><strong>Student:</strong> {currentSchool.split?.studentBenefit ?? 'N/A'}%</p>
              <p><strong>Organization:</strong> {currentSchool.split?.organizationBenefit ?? 'N/A'}%</p>
              <p><strong>Raffle:</strong> {currentSchool.split?.raffleBenefit ?? 'N/A'}%</p>
            </div>
          </div>

          {currentSchool.campaigns?.length > 1 && (
            <div>
              <h4 className="font-semibold">Campaign History</h4>
              <div className="space-y-2">
                {currentSchool.campaigns
                  .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
                  .map((campaign) => (
                    <div key={campaign._id?.toString() ?? `history-${campaign.campaignNumber}`}
                      className="flex flex-wrap gap-4 text-sm border rounded-md p-3">
                      <span><strong>No :</strong> {campaign.campaignNumber}</span>
                      <span><strong>Début :</strong> {formatDisplayDate(campaign.startDate)}</span>
                      <span><strong>Fin :</strong> {formatDisplayDate(campaign.endDate)}</span>
                      <span><strong>Livraison :</strong> {formatDisplayDate(campaign.deliveryDate)}</span>
                      {campaign.isActive && <span className="font-semibold">(Active)</span>}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {Object.keys(currentSchool.customFields || {}).length > 0 && (
            <div>
              <h4 className="font-semibold">Custom Fields</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(currentSchool.customFields).map(([key, value]) => (
                  <div key={key}>
                    <p><strong>{key}:</strong> {value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchoolInfo;
