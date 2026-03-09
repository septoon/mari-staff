import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './components/shared/BottomNav';
import { ClientActionsSheet } from './components/shared/ClientActionsSheet';
import { ClientsExportSheet } from './components/shared/ClientsExportSheet';
import { ClientsSmsBroadcastSheet } from './components/shared/ClientsSmsBroadcastSheet';
import { ClientsToolsSheet } from './components/shared/ClientsToolsSheet';
import { GlobalLoaderOverlay } from './components/shared/GlobalLoaderOverlay';
import { InfoPanel } from './components/shared/InfoPanel';
import { JournalStaffActionsSheet } from './components/shared/JournalStaffActionsSheet';
import { JournalWeekStrip } from './components/shared/JournalWeekStrip';
import { LoaderScreen } from './components/shared/LoaderScreen';
import { LoginScreen } from './components/shared/LoginScreen';
import { ResetPinScreen } from './components/shared/ResetPinScreen';
import { SetPinScreen } from './components/shared/SetPinScreen';
import { Shell } from './components/shared/Shell';
import { StaffPermissionsSheet } from './components/shared/StaffPermissionsSheet';
import { ClientHistoryScreen } from './screens/ClientHistoryScreen';
import { ClientSiteEditorScreen } from './screens/ClientSiteEditorScreen';
import { ClientsScreen } from './screens/ClientsScreen';
import { JournalDayEditScreen } from './screens/JournalDayEditScreen';
import { JournalDayRemoveScreen } from './screens/JournalDayRemoveScreen';
import { JournalAppointmentScreen } from './screens/JournalAppointmentScreen';
import { JournalClientScreen } from './screens/JournalClientScreen';
import { JournalScreen } from './screens/JournalScreen';
import { MoreScreen } from './screens/MoreScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { OwnerEditScreen } from './screens/OwnerEditScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { ScheduleEditorScreen } from './screens/ScheduleEditorScreen';
import { ServiceCategoryEditorScreen } from './screens/ServiceCategoryEditorScreen';
import { ServiceEditorScreen } from './screens/ServiceEditorScreen';
import { ServicesCategoriesScreen } from './screens/ServicesCategoriesScreen';
import { ServicesCategoryScreen } from './screens/ServicesCategoryScreen';
import { StaffEditorScreen } from './screens/StaffEditorScreen';
import { StaffManagementScreen } from './screens/StaffManagementScreen';
import { StaffServicesEditorScreen } from './screens/StaffServicesEditorScreen';
import { normalizePhoneForLink, normalizePhoneForWhatsApp } from './helpers';
import type { AppController, ClientItem, StaffItem } from './types';

type AppViewProps = {
  controller: AppController;
};

type ContactPickerRecord = {
  name?: string[];
  tel?: string[];
  email?: string[];
};

type NavigatorWithContacts = Navigator & {
  contacts?: {
    select: (
      properties: Array<'name' | 'tel' | 'email'>,
      options?: { multiple?: boolean },
    ) => Promise<ContactPickerRecord[]>;
  };
};

function toLocalErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Не удалось выполнить действие';
}

function escapeVCardText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function AppView({ controller }: AppViewProps) {
  const { state, actions } = controller;
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';
  const setPinToken = new URLSearchParams(location.search).get('token') || '';
  const isPinEntryRoute = pathname === '/staff/set-pin' || pathname === '/staff/reset-pin';

  useEffect(() => {
    const root = document.documentElement;

    if (!isPinEntryRoute) {
      root.style.removeProperty('--ui-scale');
      return;
    }

    root.style.setProperty('--ui-scale', '0.92');
    return () => {
      root.style.removeProperty('--ui-scale');
    };
  }, [isPinEntryRoute]);

  const isJournalMainPage = state.page === 'tabs' && state.tab === 'journal';
  const isScheduleMainPage = state.page === 'tabs' && state.tab === 'schedule';
  const showGlobalLoader =
    state.clientHistoryLoading ||
    Object.entries(state.loading).some(
      ([key, isLoading]) => key !== 'boot' && Boolean(isLoading),
    );
  const normalizedClientsQuery = state.clientsQuery.trim().toLowerCase();
  const normalizedClientsDigits = state.clientsQuery.replace(/\D/g, '');
  const visibleClients =
    normalizedClientsQuery.length === 0
      ? state.clients
      : state.clients.filter((item) => {
          const name = item.name.toLowerCase();
          const phone = item.phone.toLowerCase();
          const phoneDigits = item.phone.replace(/\D/g, '');
          return (
            name.includes(normalizedClientsQuery) ||
            phone.includes(normalizedClientsQuery) ||
            (normalizedClientsDigits.length > 0 &&
              phoneDigits.includes(normalizedClientsDigits))
          );
        });
  const [clientsToolsOpen, setClientsToolsOpen] = useState(false);
  const [clientsExportOpen, setClientsExportOpen] = useState(false);
  const [clientsSmsOpen, setClientsSmsOpen] = useState(false);
  const [clientsToolsLoading, setClientsToolsLoading] = useState(false);
  const [clientsToolsError, setClientsToolsError] = useState('');
  const activeJournalAppointment = state.journalAppointmentTarget;
  const activeJournalHistory = activeJournalAppointment
    ? state.journalClientHistory.filter((item) => {
        if (activeJournalAppointment.clientId && item.clientId) {
          return item.clientId === activeJournalAppointment.clientId;
        }
        const samePhone =
          normalizePhoneForWhatsApp(item.clientPhone) ===
          normalizePhoneForWhatsApp(activeJournalAppointment.clientPhone);
        const sameName =
          item.clientName.trim().toLowerCase() ===
          activeJournalAppointment.clientName.trim().toLowerCase();
        return samePhone || sameName;
      })
    : [];
  const activeJournalNoShows = activeJournalHistory.filter((item) => item.status === 'NO_SHOW').length;

  const clientsWithPhone = state.clients.filter((item) => item.phone.trim().length > 0);
  const smsRecipients = Array.from(
    new Set(
      clientsWithPhone.map((item) => normalizePhoneForLink(item.phone)).filter((value) => Boolean(value)),
    ),
  );
  const currentStaff = state.session
    ? state.staff.find((item) => item.id === state.session?.staff.id) ?? null
    : null;

  const closeClientsTools = () => {
    setClientsToolsOpen(false);
    setClientsToolsError('');
  };

  const openClientsTools = () => {
    setClientsToolsError('');
    setClientsToolsOpen(true);
  };

  const handleOpenExportSheet = () => {
    setClientsToolsError('');
    setClientsToolsOpen(false);
    setClientsExportOpen(true);
  };

  const handleOpenSmsSheet = () => {
    setClientsToolsError('');
    setClientsToolsOpen(false);
    setClientsSmsOpen(true);
  };

  const handleImportFromContacts = async () => {
    const picker = (navigator as NavigatorWithContacts).contacts?.select;
    if (!picker) {
      setClientsToolsError('Импорт контактов не поддерживается в этом браузере');
      return;
    }

    setClientsToolsError('');
    setClientsToolsLoading(true);
    try {
      const picked = await picker(['name', 'tel', 'email'], { multiple: true });
      const candidates = picked
        .flatMap((item) => {
          const name = item.name?.find((value) => value.trim().length > 0)?.trim() || '';
          return (item.tel || [])
            .map((phone) => phone.trim())
            .filter((phone) => phone.length > 0)
            .map((phone) => ({ name, phone }));
        })
        .filter((item) => item.phone.length > 0);

      if (candidates.length === 0) {
        setClientsToolsError('Не выбраны контакты с телефоном');
        return;
      }

      await actions.handleImportClientsFromContacts(candidates);
      closeClientsTools();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setClientsToolsError(toLocalErrorMessage(error));
    } finally {
      setClientsToolsLoading(false);
    }
  };

  const handleExportClientsToPhoneBook = async (clients: ClientItem[]) => {
    const rows = clients.filter((item) => item.phone.trim().length > 0);
    if (rows.length === 0) {
      return;
    }

    setClientsToolsLoading(true);
    try {
      const vcf = rows
        .map((client) => {
          const fullName = escapeVCardText(client.name || 'Клиент');
          const phone = escapeVCardText(normalizePhoneForLink(client.phone));
          return [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${fullName}`,
            `TEL;TYPE=CELL:${phone}`,
            'END:VCARD',
          ].join('\n');
        })
        .join('\n');

      const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
      const fileName = `mari-clients-${rows.length}.vcf`;
      const file = new File([blob], fileName, { type: 'text/vcard' });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };

      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Клиенты Mari Beauty',
          text: 'Экспорт контактов клиентов',
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setClientsExportOpen(false);
    } catch (error) {
      setClientsExportOpen(false);
      setClientsToolsOpen(true);
      setClientsToolsError(toLocalErrorMessage(error));
    } finally {
      setClientsToolsLoading(false);
    }
  };

  const handleSendSmsToAllClients = async (message: string) => {
    const text = message.trim();
    if (!text || smsRecipients.length === 0) {
      return;
    }
    const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const delimiter = isApple ? '&' : '?';
    window.location.href = `sms:${smsRecipients.join(',')}${delimiter}body=${encodeURIComponent(text)}`;
    setClientsSmsOpen(false);
  };

  if (state.loading.boot) {
    return (
      <Shell>
        <LoaderScreen label="Восстанавливаю сессию..." />
      </Shell>
    );
  }

  if (!state.session) {
    if (pathname === '/staff/set-pin') {
      return (
        <Shell>
          <SetPinScreen
            loading={state.loading.auth}
            token={setPinToken}
            error={state.authError}
            onSubmit={async (pin) => {
              await actions.handleSetPin(setPinToken, pin);
            }}
          />
          {showGlobalLoader ? <GlobalLoaderOverlay /> : null}
        </Shell>
      );
    }

    if (pathname === '/staff/reset-pin') {
      return (
        <Shell>
          <ResetPinScreen
            loading={state.loading.auth}
            token={setPinToken}
            error={state.authError}
            onRequest={actions.handleRequestPinReset}
            onConfirm={async (token, newPin) => {
              await actions.handleConfirmPinReset(token, newPin);
            }}
          />
          {showGlobalLoader ? <GlobalLoaderOverlay /> : null}
        </Shell>
      );
    }

    return (
      <Shell>
        <LoginScreen
          loading={state.loading.auth}
          phone={state.authPhone}
          pin={state.authPin}
          error={state.authError}
          onPhoneChange={actions.setAuthPhone}
          onPinChange={actions.setAuthPin}
          onLogin={() => {
            void actions.handleLogin();
          }}
        />
        {showGlobalLoader ? <GlobalLoaderOverlay /> : null}
      </Shell>
    );
  }

  return (
    <Shell>
      {state.appError ? (
        <div className="mx-4 mt-1 rounded-xl border border-[#efc0c0] bg-[#fdf0f0] px-4 py-2 text-sm font-semibold text-[#b73030]">
          {state.appError}
        </div>
      ) : null}

      <main
        className={clsx(
          'scrollbar-hidden flex-1 overflow-y-auto px-6',
          isJournalMainPage ? 'pb-[192px]' : isScheduleMainPage ? 'pb-[94px]' : 'pb-[106px]',
        )}
      >
        {state.page === 'staff' ? (
          <StaffManagementScreen
            staff={state.filteredStaff}
            loading={state.loading.staff || state.loading.action}
            search={state.staffSearch}
            onBack={actions.backFromStaffList}
            onSearchChange={actions.setStaffSearch}
            filters={state.staffFilter}
            serviceCounts={state.staffServiceCounts}
            onFilterChange={actions.setStaffFilter}
            onRefresh={() => {
              void actions.refreshStaffAndMeta();
            }}
            onCreate={actions.openStaffCreate}
            onEdit={(item) => actions.openStaffEdit(item)}
          />
        ) : null}
        {state.page === 'staffEditor' && state.staffFormMode ? (
          <StaffEditorScreen
            mode={state.staffFormMode}
            draft={state.staffDraft}
            loading={state.loading.action}
            serviceCount={state.editorServiceCount}
            permissionSummary={
              state.editorPermissionCodes.length > 0
                ? `${state.editorPermissionCodes.length} прав`
                : 'Нет выданных прав'
            }
            hasAccess={state.editorAccessEnabled}
            canDelete={state.staffFormMode === 'edit'}
            onBack={actions.backFromStaffEditor}
            onDraftChange={actions.setStaffDraft}
            onAccessChange={actions.setEditorAccessEnabled}
            onSave={
              state.staffFormMode === 'create'
                ? () => {
                    void actions.handleCreateStaff();
                  }
                : () => {
                    void actions.handleUpdateStaff();
                  }
            }
            onDelete={() => {
              void actions.handleFireStaff();
            }}
            onOpenServices={actions.openEditorServicesPanel}
            onOpenPermissions={actions.openEditorPermissionsPanel}
            avatarUrl={state.staffAvatarPreviewUrl}
            canDeleteAvatar={Boolean(state.staffAvatarPreviewUrl)}
            onAvatarFilePick={(file) => {
              void actions.handleSelectStaffAvatarFile(file);
            }}
            onDeleteAvatar={() => {
              void actions.handleDeleteStaffAvatar();
            }}
          />
        ) : null}
        {state.page === 'staffServicesEditor' ? (
          <StaffServicesEditorScreen
            staffName={state.staffDraft.name || 'Сотрудник'}
            services={state.services}
            selectedServiceIds={state.staffServicesEditorSelectedIds}
            search={state.staffServicesEditorQuery}
            loading={state.loading.action}
            onBack={actions.closeStaffServicesEditor}
            onSearchChange={actions.setStaffServicesEditorQuery}
            onToggleService={actions.toggleStaffServiceSelection}
            onToggleCategory={actions.toggleStaffServiceCategorySelection}
            onSave={() => {
              void actions.saveStaffServicesEditor();
            }}
          />
        ) : null}
        {state.page === 'owner' ? (
          <OwnerEditScreen
            draft={state.ownerDraft}
            role={state.session.staff.role}
            canEdit={state.ownerCanEdit}
            loading={state.loading.action}
            avatarUrl={state.ownerAvatarPreviewUrl}
            canDeleteAvatar={Boolean(state.ownerAvatarPreviewUrl)}
            onBack={actions.closeOwnerPage}
            onDraftChange={actions.setOwnerDraft}
            onSave={() => {
              void actions.handleSaveOwner();
            }}
            onAvatarFilePick={(file: File) => {
              void actions.handleSelectOwnerAvatarFile(file);
            }}
            onDeleteAvatar={() => {
              void actions.handleDeleteOwnerAvatar();
            }}
          />
        ) : null}
        {state.page === 'tabs' && state.tab === 'journal' ? (
          <JournalScreen
            selectedDate={state.selectedDate}
            staff={state.journalStaff}
            journalHours={state.journalHours}
            cards={state.journalCards}
            loading={state.loading.appointments || state.loading.action}
            datePickerOpen={state.journalDatePickerOpen}
            markedDates={state.journalMarkedDates}
            onSetDate={actions.handleSetDate}
            onCloseDatePicker={actions.closeJournalDatePicker}
            onSelectDate={actions.selectJournalDate}
            onCreate={() => {
              void actions.handleCreateAppointment();
            }}
            onReload={() => {
              void actions.loadAppointmentsForSelectedDate();
            }}
            onSettings={() => {
              void actions.refreshAll();
            }}
            onStaffClick={actions.handleOpenJournalStaffActions}
            onCardClick={actions.handleOpenJournalAppointment}
          />
        ) : null}
        {state.page === 'journalAppointment' ? (
          <JournalAppointmentScreen
            appointment={state.journalAppointmentTarget}
            loading={state.loading.action}
            canEdit={state.canEditJournal}
            visitsCount={activeJournalHistory.length}
            noShowCount={activeJournalNoShows}
            onBack={actions.handleCloseJournalAppointment}
            onStatusChange={(status) => {
              void actions.handleUpdateJournalAppointmentStatus(status);
            }}
            onOpenClient={() => {
              void actions.handleOpenJournalClient();
            }}
            onCall={actions.handleCallJournalClient}
            onSms={actions.handleSmsJournalClient}
            onWhatsApp={actions.handleWhatsAppJournalClient}
          />
        ) : null}
        {state.page === 'journalClient' ? (
          <JournalClientScreen
            client={state.journalClientTarget}
            draft={state.journalClientDraft}
            appointments={state.journalClientHistory}
            loading={state.journalClientLoading}
            saving={state.journalClientSaving}
            canEdit={state.canEditClients}
            onBack={actions.handleCloseJournalClient}
            onDraftChange={actions.setJournalClientDraft}
            onSave={() => {
              void actions.handleSaveJournalClient();
            }}
            onOpenAppointment={actions.handleOpenJournalAppointment}
          />
        ) : null}
        {state.page === 'journalDayEdit' ? (
          <JournalDayEditScreen
            staff={state.journalActionStaff}
            selectedDate={state.selectedDate}
            start={state.journalDayStart}
            end={state.journalDayEnd}
            loading={state.loading.action}
            onBack={actions.handleBackFromJournalDayAction}
            onStartChange={actions.setJournalDayStart}
            onEndChange={actions.setJournalDayEnd}
            onSave={() => {
              void actions.handleSaveJournalDayEdit();
            }}
          />
        ) : null}
        {state.page === 'journalDayRemove' ? (
          <JournalDayRemoveScreen
            staff={state.journalActionStaff}
            selectedDate={state.selectedDate}
            loading={state.loading.action}
            onBack={actions.handleBackFromJournalDayAction}
            onConfirm={() => {
              void actions.handleSaveJournalDayRemove();
            }}
          />
        ) : null}
        {state.page === 'tabs' && state.tab === 'schedule' ? (
          <ScheduleScreen
            selectedDate={state.selectedDate}
            staff={state.visibleStaff}
            hoursByStaff={state.workingHoursByStaff}
            loading={state.loading.schedule || state.loading.staff || state.loading.action}
            onReload={() => {
              void actions.refreshAll();
            }}
            onEdit={() => {
              void actions.handleScheduleEdit();
            }}
            onEditStaff={(item: StaffItem) => {
              void actions.openScheduleEditorForStaff(item);
            }}
            onSelectDate={actions.setSelectedDate}
          />
        ) : null}
        {state.page === 'scheduleEditor' ? (
          <ScheduleEditorScreen
            staff={state.scheduleEditorStaff}
            selectedDate={state.selectedDate}
            selectedDays={state.scheduleEditorDays}
            start={state.scheduleEditorStart}
            end={state.scheduleEditorEnd}
            loading={state.loading.action}
            onBack={actions.closeScheduleEditor}
            onToggleDay={actions.toggleScheduleEditorDay}
            onStartChange={actions.setScheduleEditorStart}
            onEndChange={actions.setScheduleEditorEnd}
            onPresetSelect={actions.applyScheduleEditorPreset}
            onSave={() => {
              void actions.saveScheduleEditor();
            }}
            onClear={() => {
              void actions.clearScheduleEditor();
            }}
          />
        ) : null}
        {state.page === 'tabs' && state.tab === 'clients' ? (
          <ClientsScreen
            clients={visibleClients}
            query={state.clientsQuery}
            loading={state.loading.clients || state.loading.action}
            onQueryChange={actions.setClientsQuery}
            onOpenTools={openClientsTools}
            onAdd={() => {
              void actions.resetAndLoadClients();
            }}
            onOpenClientActions={actions.handleOpenClientActions}
          />
        ) : null}
        {state.page === 'clientHistory' ? (
          <ClientHistoryScreen
            client={state.clientHistoryTarget}
            appointments={state.clientHistoryAppointments}
            loading={state.clientHistoryLoading}
            onBack={actions.handleCloseClientHistory}
          />
        ) : null}
        {state.page === 'tabs' && state.tab === 'notifications' ? (
          <NotificationsScreen
            notifications={state.notifications}
            loading={state.loading.appointments}
            onReload={() => {
              void actions.loadAppointmentsForSelectedDate();
            }}
            onOpenAll={() => actions.setTab('journal')}
          />
        ) : null}
        {state.page === 'tabs' && state.tab === 'more' ? (
          <MoreScreen
            session={state.session}
            currentStaff={currentStaff}
            loading={state.loading.action}
            menu={state.moreMenu}
            onProfileClick={() => {
              void actions.handleOpenOwnerEditor();
            }}
            onAction={(title) => {
              void actions.handleMoreAction(title);
            }}
            onLogout={() => {
              void actions.handleLogout();
            }}
          />
        ) : null}
        {state.page === 'clientSiteEditor' ? (
          <ClientSiteEditorScreen onBack={actions.closeClientSiteEditor} />
        ) : null}
        {state.page === 'servicesCategories' ? (
          <ServicesCategoriesScreen
            categories={state.filteredServiceCategories}
            search={state.servicesCategorySearch}
            onSearchChange={actions.setServicesCategorySearch}
            onBack={actions.closeServicesPage}
            onCreateCategory={() => actions.openServiceCategoryEditor(null)}
            onOpenCategory={actions.openServiceCategory}
            onEditCategory={actions.openServiceCategoryEditor}
          />
        ) : null}
        {state.page === 'servicesCategory' ? (
          <ServicesCategoryScreen
            categoryName={state.selectedServiceCategoryName || 'Категория'}
            services={state.filteredSelectedCategoryServices}
            search={state.servicesItemsSearch}
            onSearchChange={actions.setServicesItemsSearch}
            onBack={actions.closeServiceCategory}
            onCreateService={() => actions.openServiceEditor(null)}
            onOpenService={actions.openServiceEditor}
            onEditCategory={() =>
              actions.openServiceCategoryEditor(state.selectedServiceCategoryId)
            }
          />
        ) : null}
        {state.page === 'serviceCategoryEditor' ? (
          <ServiceCategoryEditorScreen
            title={state.serviceCategoryEditorName || 'Новая категория'}
            name={state.serviceCategoryEditorName}
            loading={state.loading.action}
            canDelete={Boolean(state.serviceCategoryEditorId)}
            onBack={actions.closeServiceCategoryEditor}
            onNameChange={actions.setServiceCategoryEditorName}
            onSave={() => {
              void actions.saveServiceCategoryEditor();
            }}
            onDelete={() => {
              void actions.deleteServiceCategoryEditor();
            }}
          />
        ) : null}
        {state.page === 'serviceEditor' ? (
          <ServiceEditorScreen
            draft={state.serviceDraft}
            categories={state.serviceCategories}
            providers={state.serviceProviders}
            assignableStaff={state.serviceAssignableStaff}
            providersLoading={state.serviceProvidersLoading}
            loading={state.loading.action}
            canDelete={Boolean(state.serviceDraft.id)}
            onBack={actions.closeServiceEditor}
            onDraftChange={actions.setServiceDraft}
            onSave={() => {
              void actions.saveServiceEditor();
            }}
            onDelete={() => {
              void actions.deleteServiceEditor();
            }}
            onAssignProviders={(staffIds: string[]) => {
              void actions.syncServiceProvidersForCurrentService(staffIds);
            }}
            onRemoveProvider={(staffId: string) => {
              void actions.removeServiceProviderFromCurrentService(staffId);
            }}
            imagePreviewUrl={state.serviceImagePreviewUrl}
            onImageFilePick={(file: File) => {
              void actions.handleSelectServiceImageFile(file);
            }}
          />
        ) : null}
      </main>

      {isJournalMainPage ? (
        <div className="fixed left-1/2 z-40 w-full px-4 -translate-x-1/2" style={{ bottom: '94px' }}>
          <JournalWeekStrip
            selectedDate={state.selectedDate}
            weekDates={state.weekDates}
            onDaySelect={actions.setSelectedDate}
          />
        </div>
      ) : null}
      <div className="fixed left-1/2 z-[45] px-8 w-full -translate-x-1/2" style={{ bottom: '20px' }}>
        <BottomNav active={state.tab} items={state.visibleTabs} onChange={actions.handleTabChange} />
      </div>
      {state.page === 'tabs' && state.tab === 'clients' ? (
        <>
          <ClientsToolsSheet
            open={clientsToolsOpen}
            loading={clientsToolsLoading}
            error={clientsToolsError}
            onClose={closeClientsTools}
            onOpenExport={handleOpenExportSheet}
            onImportFromContacts={() => {
              void handleImportFromContacts();
            }}
            onOpenSmsBroadcast={handleOpenSmsSheet}
          />
          <ClientsExportSheet
            open={clientsExportOpen}
            clients={state.clients}
            loading={clientsToolsLoading}
            onClose={() => setClientsExportOpen(false)}
            onExport={async (clients) => {
              await handleExportClientsToPhoneBook(clients);
            }}
          />
          <ClientsSmsBroadcastSheet
            open={clientsSmsOpen}
            recipientsCount={smsRecipients.length}
            loading={clientsToolsLoading}
            onClose={() => setClientsSmsOpen(false)}
            onSend={async (message) => {
              await handleSendSmsToAllClients(message);
            }}
          />
        </>
      ) : null}
      <ClientActionsSheet
        client={state.clientActionsFor}
        onClose={actions.handleCloseClientActions}
        onOpenHistory={() => {
          void actions.handleOpenClientHistory();
        }}
        onOpenLoyalty={() => {
          void actions.handleOpenClientLoyalty();
        }}
        onCall={actions.handleCallClient}
        onSms={actions.handleSmsClient}
        onWhatsApp={actions.handleWhatsAppClient}
        onDelete={actions.handleDeleteClient}
      />
      {state.page === 'tabs' && state.tab === 'journal' ? (
        <JournalStaffActionsSheet
          staff={state.journalActionStaff}
          onClose={actions.handleCloseJournalStaffActions}
          onEditDay={actions.handleOpenJournalDayEditPage}
          onRemoveDay={actions.handleOpenJournalDayRemovePage}
          onOpenScheduleEdit={actions.handleOpenJournalSchedulePage}
        />
      ) : null}
      <StaffPermissionsSheet
        open={state.editorPermissionsSheetOpen}
        catalog={state.editorPermissionCatalog}
        enabledCodes={state.editorPermissionCodes}
        busyCode={state.editorPermissionBusyCode}
        onClose={actions.closeEditorPermissionsPanel}
        onToggle={(code, enabled) => {
          void actions.toggleEditorPermission(code, enabled);
        }}
      />
      <InfoPanel panel={state.panel} onClose={actions.closePanel} />
      {showGlobalLoader ? <GlobalLoaderOverlay /> : null}
    </Shell>
  );
}
