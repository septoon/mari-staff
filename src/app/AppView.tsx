import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './components/shared/BottomNav';
import { ClientActionsSheet } from './components/shared/ClientActionsSheet';
import { ClientsExportSheet } from './components/shared/ClientsExportSheet';
import { ClientsSmsBroadcastSheet } from './components/shared/ClientsSmsBroadcastSheet';
import { ClientsToolsSheet } from './components/shared/ClientsToolsSheet';
import { DesktopTabSidebar } from './components/shared/DesktopTabSidebar';
import { GlobalLoaderOverlay } from './components/shared/GlobalLoaderOverlay';
import { InfoPanel } from './components/shared/InfoPanel';
import { JournalMiniCalendar } from './components/shared/JournalMiniCalendar';
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
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { JournalDayEditScreen } from './screens/JournalDayEditScreen';
import { JournalDayRemoveScreen } from './screens/JournalDayRemoveScreen';
import { JournalAppointmentScreen } from './screens/JournalAppointmentScreen';
import { JournalClientScreen } from './screens/JournalClientScreen';
import { JournalTabScreen } from './screens/JournalTabScreen';
import { MoreScreen } from './screens/MoreScreen';
import { OwnerEditScreen } from './screens/OwnerEditScreen';
import { PrivacyPolicyScreen } from './screens/PrivacyPolicyScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SettingsNotificationsScreen } from './screens/SettingsNotificationsScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { ScheduleEditorScreen } from './screens/ScheduleEditorScreen';
import { ServiceCategoryEditorScreen } from './screens/ServiceCategoryEditorScreen';
import { ServiceEditorScreen } from './screens/ServiceEditorScreen';
import { ServicesCategoriesScreen } from './screens/ServicesCategoriesScreen';
import { ServicesCategoryScreen } from './screens/ServicesCategoryScreen';
import { StaffEditorScreen } from './screens/StaffEditorScreen';
import { StaffManagementScreen } from './screens/StaffManagementScreen';
import { StaffServicesEditorScreen } from './screens/StaffServicesEditorScreen';
import {
  appointmentMatchesClient,
  formatRub,
  normalizePhoneForLink,
  toISODate,
} from './helpers';
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
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const pathname = location.pathname.replace(/\/+$/, '') || '/';
  const setPinToken = new URLSearchParams(location.search).get('token') || '';
  const isPinEntryRoute = pathname === '/staff/set-pin' || pathname === '/staff/reset-pin';

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) {
      return;
    }
    const previousValue = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previousValue;
    };
  }, []);

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

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      // jsdom and embedded webviews may not implement scrollTo.
    }

    try {
      document.documentElement.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
      document.body.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
      mainScrollRef.current?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      // Ignore environments without element scrolling support.
    }
  }, [pathname]);

  const isJournalMainPage = state.page === 'tabs' && state.tab === 'journal';
  const isScheduleMainPage = state.page === 'tabs' && state.tab === 'schedule';
  const isJournalDesktopOverlayPage =
    state.tab === 'journal' && state.page === 'journalAppointment';
  const showGlobalLoader =
    state.clientHistoryLoading ||
    Object.entries(state.loading).some(
      ([key, isLoading]) => key !== 'boot' && key !== 'appointments' && Boolean(isLoading),
    );
  const normalizedClientsQuery = state.clientsQuery.trim().toLowerCase();
  const normalizedClientsDigits = state.clientsQuery.replace(/\D/g, '');
  const rawSessionPermissions = state.session?.staff.permissions;
  const sessionPermissions: string[] = Array.isArray(rawSessionPermissions) ? rawSessionPermissions : [];
  const canManageClientDiscounts =
    state.session?.staff.role === 'OWNER' || sessionPermissions.includes('MANAGE_CLIENT_DISCOUNTS');
  const canManageClientAvatars =
    Boolean(state.canEditClients) || sessionPermissions.includes('MANAGE_CLIENT_AVATARS');
  const canManagePromocodes =
    state.session?.staff.role === 'OWNER' || sessionPermissions.includes('MANAGE_PROMOCODES');
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
            (item.email || '').toLowerCase().includes(normalizedClientsQuery) ||
            (normalizedClientsDigits.length > 0 &&
              phoneDigits.includes(normalizedClientsDigits))
          );
        });
  const [clientsToolsOpen, setClientsToolsOpen] = useState(false);
  const [clientsExportOpen, setClientsExportOpen] = useState(false);
  const [clientsSmsOpen, setClientsSmsOpen] = useState(false);
  const [clientsToolsLoading, setClientsToolsLoading] = useState(false);
  const [clientsToolsError, setClientsToolsError] = useState('');
  const scheduleMarkedDates = useMemo(() => {
    const datesWithHours = new Set<string>();
    Object.values(state.workingHoursByStaff).forEach((byDay) => {
      Object.entries(byDay).forEach(([date, slots]) => {
        if (slots.length > 0) {
          datesWithHours.add(date);
        }
      });
    });

    if (datesWithHours.size === 0) {
      return [] as string[];
    }

    return Array.from(datesWithHours).sort((left, right) => left.localeCompare(right));
  }, [state.workingHoursByStaff]);
  const activeJournalAppointment = state.journalAppointmentTarget;
  const activeJournalHistory = activeJournalAppointment
    ? state.journalClientHistory.filter((item) =>
        appointmentMatchesClient(item, {
          id: activeJournalAppointment.clientId,
          name: activeJournalAppointment.clientName,
          phone: activeJournalAppointment.clientPhone,
        }),
      )
    : [];
  const activeJournalNoShows = activeJournalHistory.filter((item) => item.status === 'NO_SHOW').length;

  const clientsWithPhone = state.clients.filter((item) => item.phone.trim().length > 0);
  const mobileVisibleTabs = useMemo(() => state.visibleTabs, [state.visibleTabs]);
  const smsRecipients = Array.from(
    new Set(
      clientsWithPhone.map((item) => normalizePhoneForLink(item.phone)).filter((value) => Boolean(value)),
    ),
  );
  const showDesktopRail = Boolean(state.session) && !isPinEntryRoute;
  const desktopRailMarkedDates = state.tab === 'schedule' ? scheduleMarkedDates : state.journalMarkedDates;
  const showOwnerDaySummary = state.session?.staff.role === 'OWNER';
  const desktopRailTodaySummary = useMemo(() => {
    const todayIso = toISODate(new Date());
    const todayAppointments = state.journalListAppointments.filter(
      (item) => toISODate(item.startAt) === todayIso,
    );
    const confirmed = todayAppointments.filter((item) => {
      const status = item.status;
      return status === 'CONFIRMED' || status === 'ARRIVED';
    }).length;
    const revenue = todayAppointments.reduce((sum, item) => {
      const amount = item.amountAfterDiscount ?? item.amountBeforeDiscount ?? 0;
      return sum + amount;
    }, 0);

    return {
      total: todayAppointments.length,
      confirmed,
      revenue,
    };
  }, [state.journalListAppointments]);
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

      {showDesktopRail ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-[420px] md:block">
          <div className="pointer-events-auto flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain bg-[#f3f5f8] px-6 pb-6">
            <DesktopTabSidebar
              active={state.tab}
              items={state.visibleTabs}
              onChange={actions.handleTabChange}
            />
            <div className="mt-5">
              <JournalMiniCalendar
                selectedDate={state.selectedDate}
                markedDates={desktopRailMarkedDates}
                onSelectDate={actions.setSelectedDate}
              />
            </div>
            {showOwnerDaySummary ? (
              <section className="mt-5 rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">
                  Сводка дня
                </p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[20px] bg-[#f5f7fa] px-4 py-3">
                    <p className="text-sm font-semibold text-[#7b8390]">Всего записей</p>
                    <p className="mt-1 text-[28px] font-extrabold leading-none text-ink">
                      {desktopRailTodaySummary.total}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-[#f5f7fa] px-4 py-3">
                    <p className="text-sm font-semibold text-[#7b8390]">Подтверждены</p>
                    <p className="mt-1 text-[28px] font-extrabold leading-none text-ink">
                      {desktopRailTodaySummary.confirmed}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-[#f5f7fa] px-4 py-3">
                    <p className="text-sm font-semibold text-[#7b8390]">Оборот дня</p>
                    <p className="mt-1 text-[28px] font-extrabold leading-none text-ink">
                      {desktopRailTodaySummary.revenue > 0
                        ? formatRub(desktopRailTodaySummary.revenue)
                        : '—'}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      <main
        ref={mainScrollRef}
        className={clsx(
          'scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6',
          showDesktopRail ? 'md:pl-[444px] md:pr-6' : undefined,
          isJournalMainPage
            ? 'pb-[calc(env(safe-area-inset-bottom)+208px)] md:pb-6'
            : isScheduleMainPage
              ? 'pb-[calc(env(safe-area-inset-bottom)+132px)] md:pb-6'
              : 'pb-[calc(env(safe-area-inset-bottom)+144px)] md:pb-6',
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
            permissionCatalog={state.editorPermissionCatalog}
            permissionCodes={state.editorPermissionCodes}
            permissionBusyCode={state.editorPermissionBusyCode}
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
            onTogglePermission={(code, enabled) => {
              void actions.toggleEditorPermission(code, enabled);
            }}
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
          <JournalTabScreen
            selectedDate={state.selectedDate}
            staff={state.journalStaff}
            journalHours={state.journalHours}
            cards={state.journalCards}
            listAppointments={state.journalListAppointments}
            loading={state.loading.appointments}
            datePickerOpen={state.journalDatePickerOpen}
            markedDates={state.journalMarkedDates}
            visibleTabs={state.visibleTabs}
            activeTab={state.tab}
            showOwnerDaySummary={false}
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
            onTabChange={actions.handleTabChange}
            onStaffClick={actions.handleOpenJournalStaffActions}
            onCardClick={actions.handleOpenJournalAppointment}
          />
        ) : null}
        {isJournalDesktopOverlayPage ? (
          <div className="hidden md:block">
            <JournalTabScreen
              selectedDate={state.selectedDate}
              staff={state.journalStaff}
              journalHours={state.journalHours}
              cards={state.journalCards}
            listAppointments={state.journalListAppointments}
            loading={state.loading.appointments}
            datePickerOpen={state.journalDatePickerOpen}
            markedDates={state.journalMarkedDates}
            visibleTabs={state.visibleTabs}
            activeTab={state.tab}
            showOwnerDaySummary={false}
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
              onTabChange={actions.handleTabChange}
              onStaffClick={actions.handleOpenJournalStaffActions}
              onCardClick={actions.handleOpenJournalAppointment}
            />
          </div>
        ) : null}
        {state.page === 'journalAppointment' || state.page === 'journalClient' ? (
          <div className={state.page === 'journalClient' ? 'hidden md:block' : undefined}>
            <JournalAppointmentScreen
              appointment={state.journalAppointmentTarget}
              client={state.journalClientTarget}
              clientDraft={state.journalClientDraft}
              staff={state.staff}
              history={activeJournalHistory}
              historyLoading={state.journalClientLoading}
              historyOpen={state.page === 'journalClient'}
              loading={state.loading.action}
              canEdit={state.canEditJournal}
              visitsCount={activeJournalHistory.length}
              noShowCount={activeJournalNoShows}
              onBack={actions.handleCloseJournalAppointment}
              onCloseHistory={actions.handleCloseJournalClient}
              onStatusChange={(status: 'PENDING' | 'ARRIVED' | 'NO_SHOW' | 'CONFIRMED') => {
                void actions.handleUpdateJournalAppointmentStatus(status);
              }}
              onOpenClient={() => {
                void actions.handleOpenJournalClient();
              }}
              onOpenAppointment={actions.handleOpenJournalAppointment}
              onCall={actions.handleCallJournalClient}
              onSms={actions.handleSmsJournalClient}
              onWhatsApp={actions.handleWhatsAppJournalClient}
              onDelete={() => {
                void actions.handleDeleteJournalAppointment();
              }}
            />
          </div>
        ) : null}
        {state.page === 'journalClient' ? (
          <div className="md:hidden">
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
          </div>
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
            editorStaff={state.scheduleEditorStaff}
            editorSelectedDays={state.scheduleEditorDays}
            editorStart={state.scheduleEditorStart}
            editorEnd={state.scheduleEditorEnd}
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
            onOpenDesktopEditor={(item: StaffItem, date: Date) => {
              actions.setSelectedDate(date);
              void actions.openScheduleEditorForStaff(item, {
                presentation: 'panel',
                focusDate: date,
              });
            }}
            onCloseDesktopEditor={actions.closeScheduleEditor}
            onToggleEditorDay={actions.toggleScheduleEditorDay}
            onEditorStartChange={actions.setScheduleEditorStart}
            onEditorEndChange={actions.setScheduleEditorEnd}
            onEditorPresetSelect={actions.applyScheduleEditorPreset}
            onSaveEditor={() => {
              void actions.saveScheduleEditor();
            }}
            onClearEditor={() => {
              void actions.clearScheduleEditor();
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
            appointments={state.journalListAppointments}
            query={state.clientsQuery}
            loading={state.loading.clients || state.loading.action}
            canEdit={state.canEditClients}
            canManageAvatars={canManageClientAvatars}
            canManageDiscounts={canManageClientDiscounts}
            canManagePromocodes={canManagePromocodes}
            onQueryChange={actions.setClientsQuery}
            onOpenTools={openClientsTools}
            onReload={() => {
              void actions.resetAndLoadClients();
            }}
            onOpenClientActions={actions.handleOpenClientActions}
            onDeleteClient={actions.handleDeleteClient}
          />
        ) : null}
        {state.page === 'tabs' && state.tab === 'analytics' ? (
          <AnalyticsScreen
            selectedDate={state.selectedDate}
            staff={state.staff}
            appointments={state.journalListAppointments}
            loading={state.loading.appointments || state.loading.reports}
            onReload={() => {
              void actions.loadAppointmentsForSelectedDate();
            }}
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
        {state.page === 'settings' ? (
          <SettingsScreen
            notificationCount={state.settingsNotificationSections.reduce(
              (count, section) =>
                count + section.groups.reduce((groupCount, group) => groupCount + group.items.length, 0),
              0,
            )}
            canEdit={state.canEditSettings}
            onBack={actions.closeSettingsPage}
            onOpenNotifications={actions.openSettingsNotificationsPage}
          />
        ) : null}
        {state.page === 'settingsNotifications' ? (
          <SettingsNotificationsScreen
            sections={state.settingsNotificationSections}
            minNoticeMinutes={state.settingsNotificationMinNoticeMinutes}
            canEdit={state.canEditSettings}
            loading={state.loading.settings || state.loading.action}
            onBack={actions.closeSettingsNotificationsPage}
            onSaveMinNotice={actions.saveNotificationMinNoticeMinutes}
            onToggle={actions.toggleNotificationSetting}
          />
        ) : null}
        {state.page === 'privacyPolicy' ? (
          <PrivacyPolicyScreen
            text={state.privacyPolicyText}
            canEdit={state.canEditPrivacyPolicy}
            loading={state.loading.action}
            settingsLoading={state.loading.settings}
            onBack={actions.closePrivacyPolicyPage}
            onSave={actions.savePrivacyPolicy}
          />
        ) : null}
        {state.page === 'clientSiteEditor' ? (
          <ClientSiteEditorScreen
            onBack={actions.closeClientSiteEditor}
            onOpenServices={() => {
              void actions.openServicesPage();
            }}
          />
        ) : null}
        {state.page === 'servicesCategories' || (state.page === 'tabs' && state.tab === 'services') ? (
          <ServicesCategoriesScreen
            categories={state.serviceCategories}
            services={state.services}
            search={state.servicesCategorySearch}
            loading={state.loading.services}
            onSearchChange={actions.setServicesCategorySearch}
            onBack={actions.closeServicesPage}
            onCreateCategory={() => actions.openServiceCategoryEditor(null)}
            onCreateServiceInCategory={actions.openServiceCreateForCategory}
            onOpenCategory={actions.openServiceCategory}
            onOpenService={actions.openServiceEditor}
            onEditCategory={actions.openServiceCategoryEditor}
            onToggleServiceActive={(serviceId, enabled) =>
              actions.toggleServiceActiveInline(serviceId, enabled)
            }
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
        <div
          className="fixed left-1/2 z-40 w-full px-4 -translate-x-1/2 md:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 110px)' }}
        >
          <JournalWeekStrip
            selectedDate={state.selectedDate}
            weekDates={state.weekDates}
            onDaySelect={actions.setSelectedDate}
          />
        </div>
      ) : null}
      <div
        className={clsx(
          'fixed left-1/2 z-[45] w-full -translate-x-1/2 px-8',
          Boolean(state.session)
            ? 'md:hidden'
            : undefined,
        )}
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        <BottomNav active={state.tab} items={mobileVisibleTabs} onChange={actions.handleTabChange} />
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
