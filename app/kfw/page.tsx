'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FoerderInputs {
  buildingType: 'single_family_home' | 'multi_family_home' | 'condominium_assoc' | '';
  residentialUnits: number;
  selfUse: boolean;
  ownershipShare: number;
  totalCosts: number;
  heatPumpType: 'air' | 'ground' | 'water';
  oldHeatingType: 'oel' | 'gasetagen' | 'kohle' | 'nachtspeicher' | 'gaskessel' | 'biomasse' | 'other' | '';
  oldHeatingAge: 'older_20' | 'younger_20' | '';
  incomeBracket: 'over_40k' | 'under_40k';
  naturalRefrigerant: boolean;
}

interface BonusData {
  rate: number;
  granted: boolean;
  reason?: string;
}

interface CalculationResult {
  totalFunding: number;
  eligibleCosts: number;
  finalRate: number;
  bonuses: {
    efficiency: BonusData;
    speed: BonusData;
    income: BonusData;
  };
  commonFunding?: number;
  personalFunding?: number;
  userShareOfCommon?: number;
}

export default function WaermepumpenFoerderrechner() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [inputs, setInputs] = useState<FoerderInputs>({
    buildingType: '',
    residentialUnits: 1,
    selfUse: false,
    ownershipShare: 0,
    totalCosts: 0,
    heatPumpType: 'air',
    oldHeatingType: '',
    oldHeatingAge: '',
    incomeBracket: 'over_40k',
    naturalRefrigerant: false,
  });

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string>('');

  const CONFIG = {
    RATES: { base: 30, efficiency: 5, speed: 20, income: 30 },
    MAX_RATES: { self_occupier: 70, landlord: 35 },
  };

  const isSelfOccupier =
    inputs.buildingType === 'single_family_home' ||
    inputs.buildingType === 'condominium_assoc' ||
    (inputs.buildingType === 'multi_family_home' && inputs.selfUse);

  const showBonusQuestions = isSelfOccupier;

  const getMaxEligibleCosts = (units: number): number => {
    if (!units || units <= 1) return 30000;
    let costs = 30000 + Math.min(5, units - 1) * 15000;
    if (units > 6) {
      costs += (units - 6) * 8000;
    }
    return costs;
  };

  const determineBonuses = (inp: FoerderInputs): CalculationResult['bonuses'] => {
    const defaultBonus = (reason = ''): BonusData => ({ rate: 0, granted: false, reason });
    const bonuses = {
      efficiency: defaultBonus('Voraussetzungen nicht erfüllt'),
      speed: defaultBonus('Nur für Selbstnutzer anwendbar'),
      income: defaultBonus('Nur für Selbstnutzer anwendbar'),
    };

    // Effizienzbonus
    if (
      isSelfOccupier &&
      (inp.heatPumpType === 'ground' || inp.heatPumpType === 'water' || inp.naturalRefrigerant)
    ) {
      bonuses.efficiency = { rate: CONFIG.RATES.efficiency, granted: true };
    } else if (!isSelfOccupier) {
      bonuses.efficiency.reason =
        'Für eine Prüfung sind weitere Angaben nötig (im Rechner nur für Selbstnutzer).';
    }

    if (!isSelfOccupier) return bonuses;

    // Klimageschwindigkeitsbonus
    const quickBonusTypes = ['gasetagen', 'oel', 'kohle', 'nachtspeicher'];
    const ageDependentTypes = ['gaskessel', 'biomasse'];
    let speedGranted = false;

    if (quickBonusTypes.includes(inp.oldHeatingType)) {
      speedGranted = true;
    }
    if (ageDependentTypes.includes(inp.oldHeatingType) && inp.oldHeatingAge === 'older_20') {
      speedGranted = true;
    }

    bonuses.speed = speedGranted
      ? { rate: CONFIG.RATES.speed, granted: true }
      : defaultBonus('Heizungstyp/-alter nicht bonusrelevant');

    // Einkommensbonus
    bonuses.income =
      inp.incomeBracket === 'under_40k'
        ? { rate: CONFIG.RATES.income, granted: true }
        : defaultBonus('Einkommen > 40.000 €');

    return bonuses;
  };

  const calculateFunding = (): CalculationResult | null => {
    setError('');

    // Validierung
    if (!inputs.buildingType) {
      setError('Bitte wählen Sie einen Gebäudetyp aus.');
      return null;
    }

    if (!inputs.totalCosts || inputs.totalCosts <= 0) {
      setError('Bitte geben Sie gültige Gesamtkosten an.');
      return null;
    }

    if (
      (inputs.buildingType === 'multi_family_home' || inputs.buildingType === 'condominium_assoc') &&
      (!inputs.residentialUnits || inputs.residentialUnits < 2)
    ) {
      setError('Bitte geben Sie für ein MFH/WEG mind. 2 Wohneinheiten an.');
      return null;
    }

    if (
      inputs.buildingType === 'condominium_assoc' &&
      (!inputs.ownershipShare || inputs.ownershipShare <= 0)
    ) {
      setError('Bitte geben Sie Ihren Miteigentumsanteil an.');
      return null;
    }

    if (isSelfOccupier && !inputs.oldHeatingType) {
      setError('Bitte geben Sie die bestehende Heizung an.');
      return null;
    }

    const ageDependentTypes = ['gaskessel', 'biomasse'];
    if (
      isSelfOccupier &&
      ageDependentTypes.includes(inputs.oldHeatingType) &&
      !inputs.oldHeatingAge
    ) {
      setError('Bitte geben Sie das Alter Ihrer Gas-/Biomasseheizung an.');
      return null;
    }

    const bonuses = determineBonuses(inputs);
    const units = inputs.buildingType === 'single_family_home' ? 1 : inputs.residentialUnits;
    const maxEligibleCosts = getMaxEligibleCosts(units);
    const eligibleCosts = Math.min(inputs.totalCosts, maxEligibleCosts);

    let baseRate = CONFIG.RATES.base + bonuses.efficiency.rate;
    let personalBonusRate = bonuses.speed.rate + bonuses.income.rate;

    let totalRate = baseRate + personalBonusRate;
    const maxRate = isSelfOccupier ? CONFIG.MAX_RATES.self_occupier : CONFIG.MAX_RATES.landlord;
    const finalRate = Math.min(totalRate, maxRate);

    let calcResult: CalculationResult = {
      eligibleCosts,
      finalRate,
      bonuses,
      totalFunding: 0,
    };

    if (
      inputs.buildingType === 'condominium_assoc' ||
      (inputs.buildingType === 'multi_family_home' && isSelfOccupier)
    ) {
      const commonRate = CONFIG.RATES.base + bonuses.efficiency.rate;
      const commonFunding = eligibleCosts * (commonRate / 100);

      const personalCostBase = eligibleCosts / units;
      const maxPersonalBonusRate = CONFIG.MAX_RATES.self_occupier - commonRate;
      const finalPersonalBonusRate = Math.min(personalBonusRate, maxPersonalBonusRate);
      const personalFunding = personalCostBase * (finalPersonalBonusRate / 100);

      calcResult.commonFunding = commonFunding;
      calcResult.personalFunding = personalFunding;

      if (inputs.buildingType === 'condominium_assoc') {
        const userShareOfCommon = commonFunding * (inputs.ownershipShare / 100);
        calcResult.userShareOfCommon = userShareOfCommon;
        calcResult.totalFunding = userShareOfCommon + personalFunding;
      } else {
        calcResult.totalFunding = commonFunding + personalFunding;
      }
    } else {
      calcResult.totalFunding = eligibleCosts * (finalRate / 100);
    }

    return calcResult;
  };

  const handleCalculate = () => {
    const calcResult = calculateFunding();
    setResult(calcResult);
  };

  const handleInputChange = (field: keyof FoerderInputs, value: any) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setResult(null);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);

  const isAgeRelevant = inputs.oldHeatingType === 'gaskessel' || inputs.oldHeatingType === 'biomasse';

  return (
    <div className="min-h-screen bg-[var(--color--light-grey)]">
      {/* Header */}
      <div className="bg-white border-b-2 border-[var(--color--medium-grey)] py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/">
            <img src="/logo.svg" alt="42WATT Logo" className="h-12 cursor-pointer" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-[var(--color--medium-grey)] text-[var(--color--dark-blue)] font-semibold rounded-lg hover:bg-[var(--color--dark-grey)] hover:text-white transition-colors"
            >
              PV-Rechner
            </Link>
            <Link
              href="/kfw"
              className="px-4 py-2 bg-[var(--color--light-blue)] text-white font-semibold rounded-lg transition-colors"
            >
              Förderrechner
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 bg-[var(--color--dark-grey)] text-white font-semibold rounded-lg hover:bg-[var(--color--dark-blue)] transition-colors"
            >
              Einstellungen
            </Link>
          </div>

          {/* Mobile Burger Menu */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-[var(--color--dark-blue)] hover:bg-[var(--color--light-grey)] rounded-lg transition-colors"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {menuOpen && (
          <div className="md:hidden mt-4 flex flex-col gap-2">
            <Link
              href="/"
              className="px-4 py-2 bg-[var(--color--medium-grey)] text-[var(--color--dark-blue)] font-semibold rounded-lg hover:bg-[var(--color--dark-grey)] hover:text-white transition-colors text-center"
            >
              PV-Rechner
            </Link>
            <Link
              href="/kfw"
              className="px-4 py-2 bg-[var(--color--light-blue)] text-white font-semibold rounded-lg text-center"
            >
              Förderrechner
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 bg-[var(--color--dark-grey)] text-white font-semibold rounded-lg hover:bg-[var(--color--dark-blue)] transition-colors text-center"
            >
              Einstellungen
            </Link>
          </div>
        )}
      </div>

      {/* Title */}
      <div className="max-w-4xl mx-auto pt-8 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color--dark-blue)] mb-2">
          Wärmepumpen-Förderrechner
        </h1>
        <p className="text-lg text-[var(--color--dark-grey)] mb-2">
          BEG EM 2024 – Bundesförderung für effiziente Gebäude
        </p>
        <p className="text-sm text-[var(--color--dark-grey)] mb-8">
          Berechnen Sie Ihre maximale Förderung für den Einbau einer Wärmepumpe
        </p>
      </div>

      <div className="max-w-4xl mx-auto pb-12 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Gebäudedaten */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-[var(--color--medium-grey)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-7 h-7 text-[var(--color--dark-blue)]"
              >
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" />
              </svg>
              <h3 className="text-2xl font-bold text-[var(--color--dark-blue)]">Gebäudedaten</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                  Gebäudetyp
                </label>
                <select
                  value={inputs.buildingType}
                  onChange={(e) =>
                    handleInputChange('buildingType', e.target.value as FoerderInputs['buildingType'])
                  }
                  className="w-full px-4 py-3 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                >
                  <option value="">Bitte wählen...</option>
                  <option value="single_family_home">Einfamilienhaus</option>
                  <option value="multi_family_home">Mehrfamilienhaus</option>
                  <option value="condominium_assoc">Wohnung in einer WEG</option>
                </select>
              </div>

              {(inputs.buildingType === 'multi_family_home' ||
                inputs.buildingType === 'condominium_assoc') && (
                <div>
                  <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                    Anzahl Wohneinheiten im Haus
                  </label>
                  <input
                    type="number"
                    min="2"
                    value={inputs.residentialUnits || ''}
                    onChange={(e) =>
                      handleInputChange('residentialUnits', parseInt(e.target.value) || 0)
                    }
                    placeholder="z.B. 10"
                    className="w-full px-4 py-3 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                  />
                </div>
              )}

              {inputs.buildingType === 'multi_family_home' && (
                <div>
                  <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                    Bewohnen Sie eine der Einheiten?
                  </label>
                  <select
                    value={inputs.selfUse ? 'yes' : 'no'}
                    onChange={(e) => handleInputChange('selfUse', e.target.value === 'yes')}
                    className="w-full px-4 py-3 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                  >
                    <option value="no">Nein (reine Vermietung)</option>
                    <option value="yes">Ja (mind. eine Einheit selbst genutzt)</option>
                  </select>
                </div>
              )}

              {inputs.buildingType === 'condominium_assoc' && (
                <div>
                  <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                    Ihr Miteigentumsanteil (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={inputs.ownershipShare || ''}
                    onChange={(e) =>
                      handleInputChange('ownershipShare', parseInt(e.target.value) || 0)
                    }
                    placeholder="z.B. 8"
                    className="w-full px-4 py-3 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Persönliche Boni */}
          {showBonusQuestions && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-[var(--color--medium-grey)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-7 h-7 text-[var(--color--dark-blue)]"
                >
                  <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H2v2h2v3h2v-3h2v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <h3 className="text-2xl font-bold text-[var(--color--dark-blue)]">
                  Ihre persönlichen Boni
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                    Neue Wärmequelle
                  </label>
                  <select
                    value={inputs.heatPumpType}
                    onChange={(e) =>
                      handleInputChange('heatPumpType', e.target.value as FoerderInputs['heatPumpType'])
                    }
                    className="w-full px-4 py-3 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                  >
                    <option value="air">Luft</option>
                    <option value="ground">Erdreich (Sole)</option>
                    <option value="water">Wasser / Abwasser</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                    Bestehende Heizung
                  </label>
                  <select
                    value={inputs.oldHeatingType}
                    onChange={(e) =>
                      handleInputChange('oldHeatingType', e.target.value as FoerderInputs['oldHeatingType'])
                    }
                    className="w-full px-4 py-3 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                  >
                    <option value="">Bitte wählen...</option>
                    <option value="oel">Ölheizung</option>
                    <option value="gasetagen">Gasetagenheizung</option>
                    <option value="kohle">Kohleheizung</option>
                    <option value="nachtspeicher">Nachtspeicherheizung</option>
                    <option value="gaskessel">Gas-Zentralheizung</option>
                    <option value="biomasse">Biomasseheizung</option>
                    <option value="other">Andere</option>
                  </select>
                </div>

                <div
                  className={
                    isAgeRelevant
                      ? 'bg-[#eaf2ff] border-2 border-[var(--color--light-blue)] rounded-lg p-4 -m-4 md:col-span-2'
                      : 'md:col-span-2'
                  }
                >
                  <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                    Alter der Gas-/Biomasseheizung
                  </label>
                  <select
                    value={inputs.oldHeatingAge}
                    onChange={(e) =>
                      handleInputChange('oldHeatingAge', e.target.value as FoerderInputs['oldHeatingAge'])
                    }
                    disabled={!isAgeRelevant}
                    className="w-full px-4 py-3 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Bitte wählen...</option>
                    <option value="older_20">Mindestens 20 Jahre</option>
                    <option value="younger_20">Jünger als 20 Jahre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                    Zu versteuerndes Haushaltseinkommen
                  </label>
                  <select
                    value={inputs.incomeBracket}
                    onChange={(e) =>
                      handleInputChange('incomeBracket', e.target.value as FoerderInputs['incomeBracket'])
                    }
                    className="w-full px-4 py-3 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                  >
                    <option value="over_40k">Über 40.000 €</option>
                    <option value="under_40k">Bis 40.000 €</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.naturalRefrigerant}
                      onChange={(e) => handleInputChange('naturalRefrigerant', e.target.checked)}
                      className="w-5 h-5 text-[var(--color--light-blue)] rounded accent-[var(--color--light-blue)]"
                    />
                    <span className="ml-3 text-sm font-medium text-[var(--color--black)]">
                      Die neue Wärmepumpe nutzt ein natürliches Kältemittel (z.B. Propan R290).
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Gesamtkosten */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
              Förderfähige Gesamtkosten
            </label>
            <input
              type="number"
              value={inputs.totalCosts || ''}
              onChange={(e) => handleInputChange('totalCosts', parseFloat(e.target.value) || 0)}
              placeholder="z.B. 35000"
              className="w-full px-4 py-3 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none text-lg"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-800 text-center font-medium">
              {error}
            </div>
          )}

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="w-full py-4 bg-[var(--color--light-blue)] text-white font-bold text-lg rounded-lg hover:bg-[var(--color--dark-blue)] transition-all transform hover:-translate-y-0.5 shadow-lg"
          >
            Förderung berechnen
          </button>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-[var(--color--light-grey)] rounded-lg text-center text-sm text-[var(--color--dark-grey)]">
            Alle Angaben ohne Gewähr. Der Förderrechner ist ein freiwilliger und unverbindlicher
            Service der 42watt GmbH.
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-8 bg-[var(--color--light-green)] rounded-2xl shadow-lg p-8 animate-fadeIn">
            <div className="text-center mb-6">
              <h4 className="text-sm font-semibold text-[var(--color--dark-grey)] uppercase tracking-wide mb-2">
                {inputs.buildingType === 'condominium_assoc'
                  ? 'Ihr persönlicher Gesamtvorteil'
                  : inputs.buildingType === 'multi_family_home' && isSelfOccupier
                  ? 'Gesamtförderung (Gemeinschaft + Ihr Bonus)'
                  : 'Voraussichtliche Gesamtförderung'}
              </h4>
              <div className="text-5xl font-bold text-[var(--color--green)]">
                {formatCurrency(result.totalFunding)}
              </div>
            </div>

            <div className="space-y-2">
              {/* Basisförderung */}
              {inputs.buildingType === 'condominium_assoc' && result.userShareOfCommon !== undefined ? (
                <div className="flex justify-between items-center py-3 px-4 bg-white bg-opacity-70 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-3 text-xl">✓</span>
                    <span className="text-sm font-medium">Ihr Anteil an der Gemeinschaftsförderung</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(result.userShareOfCommon)}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center py-3 px-4 bg-white bg-opacity-70 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-3 text-xl">✓</span>
                    <span className="text-sm font-medium">Grundförderung</span>
                  </div>
                  <span className="font-semibold">{CONFIG.RATES.base}%</span>
                </div>
              )}

              {/* Effizienzbonus */}
              {!(inputs.buildingType === 'condominium_assoc') && (
                <div className="flex justify-between items-center py-3 px-4 bg-white bg-opacity-70 rounded-lg">
                  <div className="flex items-center">
                    <span className={`mr-3 text-xl ${result.bonuses.efficiency.granted ? 'text-green-600' : 'text-red-500'}`}>
                      {result.bonuses.efficiency.granted ? '✓' : '✗'}
                    </span>
                    <div>
                      <span className="text-sm font-medium">Effizienzbonus</span>
                      {!result.bonuses.efficiency.granted && result.bonuses.efficiency.reason && (
                        <div className="text-xs text-[var(--color--dark-grey)] mt-0.5">
                          {result.bonuses.efficiency.reason}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="font-semibold">
                    {result.bonuses.efficiency.granted ? `${result.bonuses.efficiency.rate}%` : '0%'}
                  </span>
                </div>
              )}

              {/* Klimageschwindigkeitsbonus */}
              <div className="flex justify-between items-center py-3 px-4 bg-white bg-opacity-70 rounded-lg">
                <div className="flex items-center">
                  <span className={`mr-3 text-xl ${result.bonuses.speed.granted ? 'text-green-600' : 'text-red-500'}`}>
                    {result.bonuses.speed.granted ? '✓' : '✗'}
                  </span>
                  <div>
                    <span className="text-sm font-medium">
                      {inputs.buildingType === 'condominium_assoc'
                        ? 'Ihr persönlicher Klimabonus'
                        : 'Klimageschwindigkeitsbonus'}
                    </span>
                    {!result.bonuses.speed.granted && result.bonuses.speed.reason && (
                      <div className="text-xs text-[var(--color--dark-grey)] mt-0.5">
                        {result.bonuses.speed.reason}
                      </div>
                    )}
                  </div>
                </div>
                <span className="font-semibold">
                  {result.bonuses.speed.granted ? `${result.bonuses.speed.rate}%` : '0%'}
                </span>
              </div>

              {/* Einkommensbonus */}
              <div className="flex justify-between items-center py-3 px-4 bg-white bg-opacity-70 rounded-lg">
                <div className="flex items-center">
                  <span className={`mr-3 text-xl ${result.bonuses.income.granted ? 'text-green-600' : 'text-red-500'}`}>
                    {result.bonuses.income.granted ? '✓' : '✗'}
                  </span>
                  <div>
                    <span className="text-sm font-medium">
                      {inputs.buildingType === 'condominium_assoc'
                        ? 'Ihr persönlicher Einkommensbonus'
                        : 'Einkommensbonus'}
                    </span>
                    {!result.bonuses.income.granted && result.bonuses.income.reason && (
                      <div className="text-xs text-[var(--color--dark-grey)] mt-0.5">
                        {result.bonuses.income.reason}
                      </div>
                    )}
                  </div>
                </div>
                <span className="font-semibold">
                  {result.bonuses.income.granted ? `${result.bonuses.income.rate}%` : '0%'}
                </span>
              </div>

              {/* Eigenanteil */}
              <div className="flex justify-between items-center py-4 px-4 bg-white border-2 border-[var(--color--green)] rounded-lg mt-4 font-bold text-lg">
                <span>Ihr voraussichtlicher Eigenanteil</span>
                <span>
                  {formatCurrency(
                    inputs.buildingType === 'condominium_assoc'
                      ? inputs.totalCosts * (inputs.ownershipShare / 100) - result.totalFunding
                      : inputs.totalCosts - result.totalFunding
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Informationen zur Förderung */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-[var(--color--dark-blue)] text-center mb-8">
            Details zur Wärmepumpen-Förderung (BEG EM)
          </h2>

          {/* Förderkomponenten */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-xl font-semibold text-[var(--color--dark-blue)] mb-6 pb-3 border-b border-[var(--color--medium-grey)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                <path d="M20 7h-2.18c.11-.31.18-.65.18-1a3 3 0 00-3-3c-1.66 0-3 1.34-3 3 0 .35.07.69.18 1H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm-9 0c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm10 13H4V9h16v11z"/>
              </svg>
              Förderkomponenten im Überblick
            </h3>
            <p className="text-[var(--color--dark-grey)] mb-6">
              Die Förderung setzt sich aus einer Grundförderung und optionalen Boni zusammen. Die Summe aller Komponenten ist auf einen maximalen Fördersatz von 70 % gedeckelt.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[var(--color--light-grey)]">
                    <th className="text-left p-3 text-[var(--color--dark-blue)] font-semibold">Komponente</th>
                    <th className="text-left p-3 text-[var(--color--dark-blue)] font-semibold">Zuschuss</th>
                    <th className="text-left p-3 text-[var(--color--dark-blue)] font-semibold">Voraussetzungen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--color--medium-grey)] hover:bg-gray-50">
                    <td className="p-3 font-medium">Grundförderung</td>
                    <td className="p-3 font-bold">30 %</td>
                    <td className="p-3 text-sm text-[var(--color--dark-grey)]">Für jede förderfähige Installation einer klimafreundlichen Heizung.</td>
                  </tr>
                  <tr className="border-b border-[var(--color--medium-grey)] hover:bg-gray-50">
                    <td className="p-3 font-medium">Klimageschwindigkeits-Bonus</td>
                    <td className="p-3 font-bold">20 %</td>
                    <td className="p-3 text-sm text-[var(--color--dark-grey)]">Nur für Selbstnutzer beim Austausch einer funktionstüchtigen fossilen oder mind. 20 Jahre alten Biomasseheizung.</td>
                  </tr>
                  <tr className="border-b border-[var(--color--medium-grey)] hover:bg-gray-50">
                    <td className="p-3 font-medium">Effizienz-Bonus</td>
                    <td className="p-3 font-bold">5 %</td>
                    <td className="p-3 text-sm text-[var(--color--dark-grey)]">Bei Nutzung von Wasser, Erdreich oder Abwasser als Wärmequelle <strong>oder</strong> bei Einsatz eines natürlichen Kältemittels.</td>
                  </tr>
                  <tr className="border-b border-[var(--color--medium-grey)] hover:bg-gray-50">
                    <td className="p-3 font-medium">Einkommens-Bonus</td>
                    <td className="p-3 font-bold">30 %</td>
                    <td className="p-3 text-sm text-[var(--color--dark-grey)]">Nur für Selbstnutzer mit einem zu versteuernden Haushaltseinkommen von max. 40.000 € pro Jahr.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Förderfähige Kosten */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-xl font-semibold text-[var(--color--dark-blue)] mb-6 pb-3 border-b border-[var(--color--medium-grey)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-.9.6-1.5 1.7-1.5 1.2 0 1.5.8 1.5 1.5H14c0-1.5-1.2-3-3.2-3C8.5 5.75 7 7.24 7 9.2c0 2.2 1.8 2.85 3.6 3.25 2.2.5 3 1.2 3 2.15 0 .9-.8 1.6-1.8 1.6-1.3 0-1.8-.9-1.8-1.7H8c0 1.7 1.3 3.1 3.2 3.1 2.4 0 3.8-1.5 3.8-3.3 0-2.1-1.7-2.8-3.2-3.15zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              </svg>
              Förderfähige Kosten & Höchstgrenzen
            </h3>
            <p className="text-[var(--color--dark-grey)] mb-4">
              Nicht nur die Wärmepumpe selbst, sondern auch viele notwendige Nebenarbeiten ("Umfeldmaßnahmen") sind förderfähig. Dazu zählen:
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-[var(--color--green)] font-bold mt-0.5">✓</span>
                <span className="text-[var(--color--dark-grey)]">Fachplanung und Baubegleitung</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color--green)] font-bold mt-0.5">✓</span>
                <span className="text-[var(--color--dark-grey)]">Installation und Inbetriebnahme</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color--green)] font-bold mt-0.5">✓</span>
                <span className="text-[var(--color--dark-grey)]">Bohrungen für Erdsonden oder Brunnen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color--green)] font-bold mt-0.5">✓</span>
                <span className="text-[var(--color--dark-grey)]">Demontage und Entsorgung der Altanlage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color--green)] font-bold mt-0.5">✓</span>
                <span className="text-[var(--color--dark-grey)]">Optimierung des Heizsystems (z.B. neue Heizkörper, Pufferspeicher)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color--green)] font-bold mt-0.5">✓</span>
                <span className="text-[var(--color--dark-grey)]">Durchführung des hydraulischen Abgleichs</span>
              </li>
            </ul>

            <p className="text-[var(--color--dark-grey)] mb-4">
              Die anrechenbaren Kosten sind nach der Anzahl der Wohneinheiten (WE) gestaffelt:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[var(--color--light-grey)]">
                    <th className="text-left p-3 text-[var(--color--dark-blue)] font-semibold">Wohneinheit</th>
                    <th className="text-left p-3 text-[var(--color--dark-blue)] font-semibold">Höchstgrenze der Kosten</th>
                    <th className="text-left p-3 text-[var(--color--dark-blue)] font-semibold">Maximaler Zuschuss (bei 70%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--color--medium-grey)] hover:bg-gray-50">
                    <td className="p-3">Erste Wohneinheit</td>
                    <td className="p-3">30.000 €</td>
                    <td className="p-3">21.000 €</td>
                  </tr>
                  <tr className="border-b border-[var(--color--medium-grey)] hover:bg-gray-50">
                    <td className="p-3">Zweite bis sechste WE (je)</td>
                    <td className="p-3">15.000 €</td>
                    <td className="p-3">10.500 €</td>
                  </tr>
                  <tr className="border-b border-[var(--color--medium-grey)] hover:bg-gray-50">
                    <td className="p-3">Ab der siebten WE (je)</td>
                    <td className="p-3">8.000 €</td>
                    <td className="p-3">5.600 €</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Antragsprozess */}
          <div className="mb-6">
            <h3 className="flex items-center gap-3 text-xl font-semibold text-[var(--color--dark-blue)] mb-6 pb-3 border-b border-[var(--color--medium-grey)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
              </svg>
              Der Antragsprozess Schritt für Schritt
            </h3>
            <p className="text-[var(--color--dark-grey)] mb-4">
              Der Antrag muss grundsätzlich <strong>vor Beginn der Maßnahmen</strong> bei der KfW eingereicht werden. Der Ablauf ist wie folgt:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-[var(--color--green)] font-bold mt-0.5">✓</span>
                <div>
                  <strong>Angebot & Vertrag:</strong> Holen Sie ein Angebot ein und schließen Sie einen Lieferungs-/Leistungsvertrag mit Ihrem Fachbetrieb ab. Wichtig: Der Vertrag muss eine Klausel enthalten, die ihn an die Förderzusage bindet (aufschiebende oder auflösende Bedingung).
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color--green)] font-bold mt-0.5">✓</span>
                <div>
                  <strong>Bestätigung zum Antrag (BzA):</strong> Ihr Fachbetrieb oder ein Energie-Effizienz-Experte erstellt die BzA. Dieses Dokument bestätigt die Förderfähigkeit Ihres Vorhabens.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color--green)] font-bold mt-0.5">✓</span>
                <div>
                  <strong>Antrag bei der KfW stellen:</strong> Mit der BzA registrieren Sie sich im Kundenportal "Meine KfW" und stellen dort den eigentlichen Förderantrag.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color--green)] font-bold mt-0.5">✓</span>
                <div>
                  <strong>Maßnahmenbeginn:</strong> Nach Erhalt der Antragsbestätigung von der KfW können Sie mit der Installation beginnen.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color--green)] font-bold mt-0.5">✓</span>
                <div>
                  <strong>Nachweise & Auszahlung:</strong> Nach Abschluss des Projekts reichen Sie die Rechnungen und weitere Nachweise im KfW-Portal ein. Nach erfolgreicher Prüfung wird Ihnen der Zuschuss ausgezahlt.
                </div>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-[var(--color--light-green)] border-l-4 border-[var(--color--green)] rounded">
              <p className="text-sm text-[var(--color--dark-blue)]">
                <strong>Wichtig:</strong> Die Beauftragung des Fachbetriebs gilt bereits als Maßnahmenbeginn. Schließen Sie den Vertrag daher erst, nachdem Sie den Förderantrag gestellt haben, es sei denn, er enthält die oben genannte Förder-Bedingung.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
