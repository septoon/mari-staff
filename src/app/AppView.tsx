import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './components/shared/BottomNav';
import { ClientActionsSheet } from './components/shared/ClientActionsSheet';
import { InfoPanel } from './components/shared/InfoPanel';
import { JournalStaffActionsSheet } from './components/shared/JournalStaffActionsSheet';
import { JournalWeekStrip } from './components/shared/JournalWeekStrip';
import { LoaderScreen } from './components/shared/LoaderScreen';
import { LoginScreen } from './components/shared/LoginScreen';
import { ResetPinScreen } from './components/shared/ResetPinScreen';
import { SetPinScreen } from './components/shared/SetPinScreen';
import { Shell } from './components/shared/Shell';
import { ClientHistoryScreen } from './screens/ClientHistoryScreen';
import { ClientsScreen } from './screens/ClientsScreen';
import { JournalDayEditScreen } from './screens/JournalDayEditScreen';
import { JournalDayRemoveScreen } from './screens/JournalDayRemoveScreen';
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
import type { AppController, StaffItem } from './types';

type AppViewProps = {
  controller: AppController;
};

export function AppView({ controller }: AppViewProps) {
  const { state, actions } = controller;
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';
  const setPinToken = new URLSearchParams(location.search).get('token') || '';
  const isJournalMainPage = state.page === 'tabs' && state.tab === 'journal';

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
      </Shell>
    );
  }

  return (
    <Shell>
      {state.toast ? (
        <div className="mx-4 mt-1 rounded-xl bg-[#1f56dd] px-4 py-2 text-sm font-semibold text-white">
          {state.toast}
        </div>
      ) : null}
      {state.appError ? (
        <div className="mx-4 mt-1 rounded-xl border border-[#efc0c0] bg-[#fdf0f0] px-4 py-2 text-sm font-semibold text-[#b73030]">
          {state.appError}
        </div>
      ) : null}

      <main
        className={clsx(
          'scrollbar-hidden flex-1 overflow-y-auto px-4',
          isJournalMainPage ? 'pb-[172px]' : 'pb-[86px]',
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
            serverDirHint={state.staffAvatarServerDirHint}
            onAvatarFilePick={(file) => {
              void actions.handleSelectStaffAvatarFile(file);
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
            loading={state.loading.action}
            onBack={actions.closeOwnerPage}
            onDraftChange={actions.setOwnerDraft}
            onSave={() => {
              void actions.handleSaveOwner();
            }}
          />
        ) : null}
        {state.page === 'tabs' && state.tab === 'journal' ? (
          <JournalScreen
            selectedDate={state.selectedDate}
            staff={state.visibleStaff}
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
            weekDates={state.weekDates}
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
            clients={state.clients}
            query={state.clientsQuery}
            loading={state.loading.clients || state.loading.action}
            onQueryChange={actions.setClientsQuery}
            onReload={() => {
              void actions.loadClientsByDebouncedQuery();
            }}
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
            imagePreviewUrl={state.serviceImagePreviewUrl}
            serverDirHint={state.serviceImageServerDirHint}
            onImageFilePick={(file) => {
              void actions.handleSelectServiceImageFile(file);
            }}
          />
        ) : null}
      </main>

      {isJournalMainPage ? (
        <div className="fixed bottom-[74px] left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-4">
          <JournalWeekStrip
            selectedDate={state.selectedDate}
            weekDates={state.weekDates}
            onDaySelect={actions.setSelectedDate}
          />
        </div>
      ) : null}
      <div className="fixed bottom-0 left-1/2 z-[45] w-full max-w-[430px] -translate-x-1/2">
        <BottomNav active={state.tab} onChange={actions.handleTabChange} />
      </div>
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
      <InfoPanel panel={state.panel} onClose={actions.closePanel} />
    </Shell>
  );
}
