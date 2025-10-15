/**
 * Certifications Page (Refactored)
 * Main orchestrator for certification listing and management
 * Reduced from 1144 lines to ~200 lines through modular architecture
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCertificationManagement } from '@/hooks/useCertificationManagement';
import { useCertificationFilters } from '@/hooks/useCertificationFilters';
import { useCategoriesAndProviders } from '@/hooks/useCategoriesAndProviders';
import { useFavoritesAndProgress } from '@/hooks/useFavoritesAndProgress';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  SearchBar,
  CertificationFilters,
  ViewModeToggle,
  CertificationCard,
  CertificationListItem,
  AddCertificationDialog,
  EditCertificationDialog,
  EmptyState,
} from '@/components/certifications';
import { Certification } from '@/lib/types/certifications';

const Certifications = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const profile = auth.profile;
  const isAdmin = auth.profile?.isAdmin || false;
  const requireAuth = (action: () => void) => {
    if (profile) {
      action();
    } else {
      navigate('/auth');
    }
  };

  // Data management hooks
  const {
    certifications,
    loading,
    error,
    deletingId,
    createCertification,
    updateCertification,
    deleteCertification,
  } = useCertificationManagement();

  const { categories } = useCategoriesAndProviders();

  const {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    selectedCategory,
    setSelectedCategory,
    viewMode,
    setViewMode,
    filteredCertifications,
  } = useCertificationFilters(certifications);

  const { favoriteIds, takersCount, toggleFavorite } = useFavoritesAndProgress(filteredCertifications);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingCertification, setEditingCertification] = useState<Certification | null>(null);

  // Event handlers
  const handleEdit = (cert: Certification) => setEditingCertification(cert);
  
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete certification "${title}"?`)) return;
    await deleteCertification(id);
  };

  const handleNavigateToDetail = (certId: string) => {
    requireAuth(() => navigate(`/certifications/${certId}`));
  };

  // Loading and error states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000814] text-gray-300">
        <p>Loading certifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000814] text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001d3d] via-[#003566] to-[#000814] text-gray-100">
      <Header />

      <main className="container mx-auto px-6 py-12 md:py-16">
        {/* Page Header */}
        <div className="mb-12 text-center relative">
          {/* Decorative background */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ffd60a]/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#003566]/20 rounded-full blur-3xl"></div>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Discover Your Next{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffc300] to-[#ffd60a]">
              Free Certification
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            Explore a vast library of high-quality IT and business certifications, meticulously
            curated to help you elevate your skills and career.
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Filters & Actions */}
        <CertificationFilters
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          isAdmin={isAdmin}
          onAddClick={() => setAddDialogOpen(true)}
        />

        {/* Results Count & View Toggle */}
        <div className="flex items-center justify-between mb-6 text-gray-300">
          <p className="text-lg font-medium">
            Showing <span className="text-[#ffd60a] font-bold">{filteredCertifications.length}</span>{' '}
            certifications
            {debouncedSearch && <span className="text-gray-400"> for "{debouncedSearch}"</span>}
          </p>
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Certifications Grid/List */}
        {filteredCertifications.length === 0 ? (
          <EmptyState searchQuery={debouncedSearch} />
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'grid grid-cols-1 gap-6'
            }
          >
            {filteredCertifications.map((cert) => {
              const Component = viewMode === 'grid' ? CertificationCard : CertificationListItem;
              
              return (
                <Component
                  key={cert.id}
                  certification={cert}
                  isAdmin={isAdmin}
                  isFavorited={!!favoriteIds[cert.id]}
                  takersCount={takersCount[cert.id] || 0}
                  deletingId={deletingId}
                  userAuthenticated={!!profile?.id}
                  onEdit={() => handleEdit(cert)}
                  onDelete={() => handleDelete(cert.id, cert.title)}
                  onToggleFavorite={() => toggleFavorite(cert.id)}
                  onNavigateToDetail={() => handleNavigateToDetail(cert.id)}
                />
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      {/* Dialogs */}
      <AddCertificationDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        categories={categories}
        onAdd={createCertification}
      />

      <EditCertificationDialog
        open={!!editingCertification}
        onOpenChange={(open) => !open && setEditingCertification(null)}
        certification={editingCertification}
        categories={categories}
        onSave={updateCertification}
      />
    </div>
  );
};

export default Certifications;
