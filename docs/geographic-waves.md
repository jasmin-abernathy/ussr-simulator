# Geographic cooperation waves (CWS)
The 195 countries are divided dynamically after the starting country is selected:
- Waves 1–6: 30 countries each.
- Wave 7: 15 countries, **including the United States last**.
- A wave unlocks only when all countries in the preceding wave have joined. The starting country counts toward wave 1.
- The United States remain invisible and unavailable until *all other 194 states* have joined. Finishing the USA ends the 195-state campaign with the victory message.

### Geographic order
Data: approximate coordinates, continental group and shared land borders based on [mledoze/countries](https://github.com/mledoze/countries), Open Database License (ODbL 1.0), see https://opendatacommons.org/licenses/odbl/. Attribution and the source of the derived geographic dataset are retained in `web/world-geography.js`.

Ordering is deterministic from the starting country:
1. Start country.
2. Same-continent countries with shared land borders.
3. Other countries of the starting continent, nearest approximate geographic centres first.
4. Countries from other continents, from near to far.
5. The USA always last.

This is a **simplified gameplay geography**: borders and coordinates are approximate and territories outside the core list are excluded. It is not a geopolitical or diplomatic statement.

All original IDs, political difficulty scores, costs, saved origins, alliances, imports and bilateral agreements are preserved. Previously acquired countries in a later wave are still considered joined and remain visible. Campaign stage is inferred from the current save (not stored separately). An arbitrary early join request is blocked in the engine, regardless of available money or communism.

Source references: https://github.com/mledoze/countries and https://www.un.org/en/about-us/non-member-states
