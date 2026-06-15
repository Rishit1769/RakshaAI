'use client';

import { useEffect, useMemo, useState } from 'react';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { ApiError } from '@/lib/api/fetcher';
import { userApi, type EmergencyContact, type EmergencyContactPayload } from '@/lib/api/user.api';
import { AppShell } from '@/components/layout/AppShell';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

type ModalMode = 'add' | 'edit' | null;

interface ContactFormState {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

interface ContactFormErrors {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

const RELATIONSHIP_OPTIONS = ['Mother', 'Father', 'Sibling', 'Spouse', 'Friend', 'Doctor', 'Other'] as const;

function emptyForm(): ContactFormState {
  return {
    name: '',
    relationship: 'Mother',
    phone: '',
    email: '',
    isPrimary: false,
  };
}

function validateContact(form: ContactFormState): ContactFormErrors {
  const errors: ContactFormErrors = {};
  if (!form.name.trim()) errors.name = 'Name is required';
  if (!form.relationship.trim()) errors.relationship = 'Relationship is required';
  if (!/^\+?[1-9]\d{9,14}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number';
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';
  return errors;
}

export default function EmergencyContactsPage() {
  const { isAuthenticated, isAuthReady } = useProtectedRoute();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [maxContacts, setMaxContacts] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmergencyContact | null>(null);
  const [form, setForm] = useState<ContactFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<ContactFormErrors>({});

  const contactCount = contacts.length;
  const disableAdd = contactCount >= maxContacts;
  const sortedContacts = useMemo(() => [...contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)), [contacts]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) return;
    void loadContacts();
  }, [isAuthReady, isAuthenticated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadContacts() {
    setLoading(true);
    setError('');
    try {
      const response = await userApi.getEmergencyContacts();
      if (response.success && response.data) {
        setContacts(response.data.contacts);
        setMaxContacts(response.data.maxContacts);
      }
    } catch (err) {
      setError(parseApiError(err, 'Unable to load emergency contacts right now.'));
    } finally {
      setLoading(false);
    }
  }

  function parseApiError(err: unknown, fallback: string) {
    if (err instanceof ApiError) return err.message || fallback;
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  }

  function openAddModal() {
    setEditingContact(null);
    setForm(emptyForm());
    setFormErrors({});
    setError('');
    setModalMode('add');
  }

  function openEditModal(contact: EmergencyContact) {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email ?? '',
      isPrimary: contact.isPrimary,
    });
    setFormErrors({});
    setError('');
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setEditingContact(null);
    setForm(emptyForm());
    setFormErrors({});
  }

  async function handleSaveContact() {
    const validationErrors = validateContact(form);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setSaving(true);
    setError('');

    const payload: EmergencyContactPayload = {
      name: form.name.trim(),
      relationship: form.relationship.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      isPrimary: form.isPrimary,
    };

    try {
      if (modalMode === 'edit' && editingContact) {
        await userApi.updateEmergencyContact(editingContact.id, payload);
        setToast('Contact updated successfully.');
      } else {
        await userApi.addEmergencyContact(payload);
        setToast('Contact added successfully.');
      }
      closeModal();
      await loadContacts();
    } catch (err) {
      setError(parseApiError(err, 'Unable to save this contact right now.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSetPrimary(contactId: string) {
    try {
      await userApi.setPrimaryEmergencyContact(contactId);
      setToast('Primary contact updated.');
      await loadContacts();
    } catch (err) {
      setError(parseApiError(err, 'Unable to update the primary contact.'));
    }
  }

  async function handleDeleteContact() {
    if (!deleteTarget) return;
    setSaving(true);
    setError('');
    try {
      await userApi.deleteEmergencyContact(deleteTarget.id);
      setDeleteTarget(null);
      setToast('Contact removed successfully.');
      await loadContacts();
    } catch (err) {
      setError(parseApiError(err, 'Unable to delete this contact.'));
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-[var(--color-muted)]">Checking session...</div>;

  if (!isAuthenticated) return null;

  return (
    <AppShell
      title="Emergency Contacts"
      subtitle="People who will be notified in case of an emergency."
      backLabel="Dashboard"
      actions={<button type="button" onClick={openAddModal} disabled={disableAdd} className="btn-primary">Add contact</button>}
    >
      <div className="space-y-6">
        <div className="product-card flex items-center justify-between">
          <p className="text-sm text-body">{contactCount} of {maxContacts} contacts configured.</p>
          <span className="eyebrow bg-surface-soft">Primary contact first</span>
        </div>

        {toast ? <div className="rounded-xl border border-safe/20 bg-safe/10 p-3 text-sm text-safe-dark">{toast}</div> : null}
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}

        {loading ? (
          <div className="product-card text-sm text-muted">Loading emergency contacts...</div>
        ) : sortedContacts.length === 0 ? (
          <div className="empty-state">
            <h2 className="text-lg font-semibold text-ink dark:text-white">No emergency contacts added yet.</h2>
            <p className="mt-2 text-sm text-muted">Add your first contact to stay protected.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedContacts.map((contact) => (
              <article key={contact.id} className="product-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{contact.name}</h2>
                    <p className="text-sm text-muted">{contact.relationship}</p>
                  </div>
                  {contact.isPrimary ? <span className="badge-safe">Primary</span> : null}
                </div>
                <div className="mt-4 space-y-2 text-sm text-body">
                  <p>{contact.phone}</p>
                  {contact.email ? <p>{contact.email}</p> : null}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {!contact.isPrimary ? <button type="button" onClick={() => handleSetPrimary(contact.id)} className="btn-secondary">Set primary</button> : null}
                  <button type="button" onClick={() => openEditModal(contact)} className="btn-secondary">Edit</button>
                  <button type="button" onClick={() => setDeleteTarget(contact)} className="btn-secondary">Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-canvas p-6 shadow-card dark:border-white/10 dark:bg-[#14171d]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-ink dark:text-white">{modalMode === 'add' ? 'Add Contact' : 'Edit Contact'}</h2>
              <button type="button" onClick={closeModal} className="text-sm text-muted">Cancel</button>
            </div>
            <div className="mt-5 space-y-4">
              <FloatingLabelInput label="Name" type="text" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} error={formErrors.name} disabled={saving} />
              <div>
                <label className="mb-2 block text-sm font-medium text-ink dark:text-white">Relationship</label>
                <select value={form.relationship} onChange={(event) => setForm((prev) => ({ ...prev, relationship: event.target.value }))} disabled={saving} className="input-field">
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {formErrors.relationship ? <p className="mt-1.5 text-xs text-emergency">{formErrors.relationship}</p> : null}
              </div>
              <FloatingLabelInput label="Phone Number" type="tel" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} error={formErrors.phone} disabled={saving} />
              <FloatingLabelInput label="Email (optional)" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} error={formErrors.email} disabled={saving} />
              <label className="inline-flex items-center gap-3 text-sm font-medium text-ink dark:text-white">
                <input type="checkbox" checked={form.isPrimary} onChange={(event) => setForm((prev) => ({ ...prev, isPrimary: event.target.checked }))} disabled={saving} className="h-4 w-4 rounded border-hairline text-primary focus:ring-0" />
                Set as primary contact
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="button" onClick={handleSaveContact} disabled={saving} className="btn-primary">
                  {saving ? (modalMode === 'edit' ? 'Updating...' : 'Saving...') : modalMode === 'edit' ? 'Update Contact' : 'Save Contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-hairline bg-canvas p-6 shadow-card dark:border-white/10 dark:bg-[#14171d]">
            <h2 className="text-xl font-semibold text-ink dark:text-white">Remove Contact</h2>
            <p className="mt-3 text-sm text-muted">Are you sure you want to remove {deleteTarget.name} from your emergency contacts?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleDeleteContact} disabled={saving} className="btn-primary">{saving ? 'Removing...' : 'Remove'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
