'use client';

import React, { useState, useEffect } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { School, ChevronDown, Plus, Crown, Shield, User } from 'lucide-react';
import { getTerminology, getOrganizationTypeLabel } from '@/utils/organizationHelpers';

const MultiSchoolSelector = ({ selectedSchoolId, onSelectSchool, onCreateSchool, onSchoolsChange, refreshTrigger }) => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      // Add cache busting parameter
      const response = await fetch(`/api/users/schools?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch schools.');
      }
      const data = await response.json();
      setSchools(data.schools || []);
      if (onSchoolsChange) {
        onSchoolsChange(data.schools || []);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3 text-amber-500" />;
      case 'admin':
        return <Shield className="h-3 w-3 text-blue-500" />;
      case 'member':
        return <User className="h-3 w-3 text-gray-500" />;
      default:
        return <School className="h-3 w-3 text-gray-400" />;
    }
  };

  const selectedSchool = schools.find(s => s.id === selectedSchoolId) || schools[0];

  const handleCreateSchool = () => {
    if (onCreateSchool) {
      onCreateSchool();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl animate-pulse"></div>
        <div className="animate-pulse bg-gray-200 h-10 w-48 rounded-lg"></div>
      </div>
    );
  }

  if (!selectedSchool && schools.length === 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="bg-white hover:bg-gray-50">
            <Plus className="h-4 w-4 mr-2" />
            Créer une organisation
          </Button>
        </DropdownMenuTrigger>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center space-x-3 min-w-[240px] max-w-[320px] justify-between bg-white hover:bg-gray-50 border-gray-300 shadow-sm h-auto py-2.5 px-3"
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {selectedSchool?.logo ? (
              <img 
                src={selectedSchool.logo} 
                alt={selectedSchool.name}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <School className="h-6 w-6 text-white" />
              </div>
            )}
            <div className="text-left flex-1 min-w-0">
              <div className="text-base font-bold text-gray-900 truncate leading-tight">
                {selectedSchool?.name || `Sélectionner une ${selectedSchool ? getTerminology(selectedSchool.organizationType || 'school').organization : 'organisation'}`}
              </div>
              <div className="text-xs text-gray-500 flex items-center space-x-1.5 mt-0.5">
                {selectedSchool && getRoleIcon(selectedSchool.role)}
                <span className="font-medium">{selectedSchool?.roleLabel || `Gestionnaire d'${selectedSchool ? getTerminology(selectedSchool.organizationType || 'school').organization : 'organisation'}`}</span>
              </div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-80 bg-white border border-gray-200 shadow-xl rounded-xl">
        <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <h3 className="font-semibold text-gray-900">Mes Organisations</h3>
          <p className="text-sm text-gray-500">{schools.length} organisation{schools.length > 1 ? 's' : ''}</p>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {schools.map((school) => (
            <DropdownMenuItem
              key={school.id}
              onClick={() => onSelectSchool && onSelectSchool(school.id)}
              className={`p-3 cursor-pointer transition-colors ${
                selectedSchoolId === school.id 
                  ? 'bg-blue-50 hover:bg-blue-100 border-l-2 border-blue-500' 
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3 w-full">
                {school.logo ? (
                  <img 
                    src={school.logo} 
                    alt={school.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    <School className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate ${
                    selectedSchoolId === school.id ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {school.name}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center space-x-1.5 mt-0.5">
                    {getRoleIcon(school.role)}
                    <span>{school.roleLabel}</span>
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
        
        <div className="border-t border-gray-200 p-2 bg-gray-50 rounded-b-xl">
          <DropdownMenuItem
            onClick={handleCreateSchool}
            className="cursor-pointer hover:bg-blue-50 rounded-lg"
          >
            <div className="flex items-center space-x-2 w-full">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Plus className="h-4 w-4 text-blue-600" />
              </div>
              <span className="font-medium text-blue-600">Créer une nouvelle organisation</span>
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MultiSchoolSelector;

