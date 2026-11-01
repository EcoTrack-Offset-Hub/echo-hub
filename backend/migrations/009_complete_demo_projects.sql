-- Complete only the known, unreviewed demo fixtures. Preserve stock and prices.
WITH demos(id, name, old_ref, demo_ref, threshold) AS (VALUES
 ('proj-001', 'Amazonia Reforestation Initiative', 'VCS-1842', 'DEMO-001', 8000),
 ('proj-002', 'Solar Energy Transition', 'GS-4921', 'DEMO-002', 12000),
 ('proj-003', 'Mangrove Restoration Initiative', 'VCS-2391', 'DEMO-003', 4500),
 ('proj-004', 'Clean Cookstoves Program', 'GS-3104', 'DEMO-004', 21000),
 ('proj-005', 'Forest Conservation Program', 'VCS-1972', 'DEMO-005', 6800),
 ('proj-006', 'Landfill Methane Capture', 'VCS-2041', 'DEMO-006', 9600)
)
UPDATE offset_projects p SET
 registry_ref=d.demo_ref,
 registry_url='https://example.com/demo-projects/' || d.id,
 certification_evidence='DEMO ONLY: Fictional project and simulated certification review for application testing. No real registry registration, independent verification, or tradable carbon credits. Inventory and prices are sample data.',
 certification_reviewed_at=now(),
 lifecycle_status='Active',
 low_inventory_threshold=COALESCE(p.low_inventory_threshold,d.threshold),
 standard='Demo - not certified',
 badge='Demo only',
 description=CASE WHEN p.description LIKE 'DEMO ONLY%' THEN p.description ELSE 'DEMO ONLY - fictional project for testing. ' || p.description END
FROM demos d
WHERE p.id=d.id AND p.name=d.name AND p.registry_ref IN (d.old_ref,d.demo_ref)
 AND p.lifecycle_status='Unreviewed' AND p.certification_reviewed_at IS NULL
 AND NULLIF(trim(p.certification_evidence),'') IS NULL;
