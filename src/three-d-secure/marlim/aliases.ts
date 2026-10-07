export function applyAliases(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input;

  const root = { ...(input as Record<string, unknown>) };
  root.soft_descriptor_challenge ??= root.softDescriptorChallenge;
  root.card_hash ??= root.cardHash;

  if (root.card && typeof root.card === 'object') {
    const card = { ...(root.card as Record<string, unknown>) };
    card.expiration_date ??= card.expirationDate;
    card.holder_name ??= card.holderName;
    root.card = card;
  }

  if (root.customer && typeof root.customer === 'object') {
    const customer = { ...(root.customer as Record<string, unknown>) };
    customer.document_number ??= customer.documentNumber;
    if (customer.phone && typeof customer.phone === 'object') {
      const phone = { ...(customer.phone as Record<string, unknown>) };
      phone.area_code ??= phone.areaCode;
      phone.country_code ??= phone.countryCode;
      customer.phone = phone;
    }
    root.customer = customer;
  }

  return root;
}
