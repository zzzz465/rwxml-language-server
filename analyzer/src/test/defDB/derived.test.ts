/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Document, parse } from '../../parser'
import $ from 'cheerio'
import { Def, DefDatabase, TypeInfoInjector, TypeInfoLoader } from '../../rimworld-types'
import typeInfo from './typeInfo.json'
import { isDerivedType } from '../../rimworld-types/util'

const XML = `\
<?xml version="1.0" encoding="utf-8" ?>
<Defs>

	<PawnKnockback.DamageKnockbackDef>
		<bulletTipDef>BulletExecutionerChain</bulletTipDef> <!--살짝 스파겟티이긴하지만 어쩔수 없음... 이거 쓰는 총알 데프-->
		<noKnockbackIfDeflected>false</noKnockbackIfDeflected> <!--true일시 갑옷같은것 떄문에 데미지가 0으로 최종 계산 될시 땡기거나 넉백하지 않고 틩겨내기-->
	
		<pullInstead>true</pullInstead> <!--true로 할시 넉백대신 작살처럼 땡겨온다...!-->
		<pullToNearbySpotInstead>true</pullToNearbySpotInstead> <!--true로 할시 밑에 있는 knockbackRadiusMin/Max와 상관없이 쏜사람의 옆으로 당기게됨-->
		<knockbackSpeedMultiplier>1</knockbackSpeedMultiplier> <!--넉백시 얼마나 빠른지 곱셈-->
		<knockbackHeightMultiplier>0</knockbackHeightMultiplier> <!--넉백시 얼마나 위로 뜨는지 곱셈-->
		<knockbackRadiusMin>2.0</knockbackRadiusMin><!--넉백 최대/최소 범위-->
		<knockbackRadiusMax>10.0</knockbackRadiusMax>
		
		<landingDamage>Stun</landingDamage> <!--이거 비워놓을시 착지 데미지 없음-->
		<landingDamageAmount>5.0</landingDamageAmount><!--넉백맞은후 공중에 떠서 착지시 데미지-->
		
		<useHarpoonGraphic>true</useHarpoonGraphic>
		<harpoonUseHarpoonUnitInstead>true</harpoonUseHarpoonUnitInstead>
		<harpoonUnit>0.5</harpoonUnit>
		<harpoonSineZAmp>1</harpoonSineZAmp>
		<harpoonSineSpeed>0.1</harpoonSineSpeed>
		<harpoonSegements>20</harpoonSegements>
		
		<graphicDataHarpoonRope>
			<texPath>WeaponTex/Harpoon_Rope</texPath>
			<graphicClass>Graphic_Single</graphicClass>
		</graphicDataHarpoonRope>
		
		<flyerToApply>AT_KnockbackFlyerDef</flyerToApply> <!--thingClass PawnKnockback.PawnKnockback 외 의 값을간진 flyer를 넣을수 있지만, 그떈 위의 설정이 반영이 안됨-->
		<emptyFlyerToApply>AT_EmptyPullFlyerDef</emptyFlyerToApply> <!--아무것도 못 맟췄을시 적용, 단 제대로 작동하려면 총알에 comp를 달아야함-->
		
		<defName>AT_ChainDamageDef</defName>
		<label>knockback damaage</label>
		<workerClass>PawnKnockback.DamageWorker_Knockback</workerClass>
		<externalViolence>true</externalViolence>
		<deathMessage>{0} has been shot to death.</deathMessage>
		<hediff>Gunshot</hediff>
		<harmAllLayersUntilOutside>true</harmAllLayersUntilOutside>
		<impactSoundType>AntyChainSound</impactSoundType>
		<armorCategory>Blunt</armorCategory>
		<overkillPctToDestroyPart>0~0.7</overkillPctToDestroyPart>
		<isRanged>true</isRanged>
		<makesAnimalsFlee>true</makesAnimalsFlee>
		
		<defaultDamage>1</defaultDamage>
		<defaultArmorPenetration>0.2</defaultArmorPenetration>
	</PawnKnockback.DamageKnockbackDef>
	
	<ThingDef ParentName="BaseBullet">
		<defName>BulletExecutionerChain</defName>
		<label>Diplomatic chain</label>
		<thingClass>PawnKnockback.Bullet_Harpoon</thingClass>
		<graphicData>
			<texPath>WeaponTex/Harpoon_Tip</texPath>
			<graphicClass>Graphic_Single</graphicClass>
		</graphicData>
		<projectile>
			<damageDef>AT_ChainDamageDef</damageDef>
			<damageAmountBase>1</damageAmountBase>
			<armorPenetrationBase>1</armorPenetrationBase>
			<speed>80</speed>
		</projectile>
		<comps>
			<li Class="PawnKnockback.CompProperties_HarpoonAttributes">
				<damageKnockbackDef>AT_ChainDamageDef</damageKnockbackDef>
			</li>
		</comps>
	</ThingDef>

</Defs>\
`

describe('DefDatabase test', () => {
  let doc: Document
  let defDB: DefDatabase
  const typeInfoMap = TypeInfoLoader.load(typeInfo as any)
  const injector = new TypeInfoInjector(typeInfoMap)

  let damageKnockbackDef: Def
  let bulletExecutionerChain: Def

  beforeEach(() => {
    doc = parse(XML)
    defDB = new DefDatabase()
    injector.inject(doc)

    damageKnockbackDef = $(doc).find('Defs > PawnKnockback\\.DamageKnockbackDef').get(0) as unknown as Def
    bulletExecutionerChain = $(doc).find('Defs > ThingDef').get(0) as unknown as Def
  })

  test('xml should be parsed as intended types', () => {
    expect(damageKnockbackDef).toBeInstanceOf(Def)
    expect(bulletExecutionerChain).toBeInstanceOf(Def)
  })

  test('DefDatabase should return defs by defName', () => {
    defDB.addDef(damageKnockbackDef)
    defDB.addDef(bulletExecutionerChain)

    let def = defDB.getDefByName('AT_ChainDamageDef')
    expect(def.length).toBeGreaterThan(0)

    const def2 = defDB.getDefByName('BulletExecutionerChain')
    expect(def2.length).toBeGreaterThan(0)

    defDB.removeDef(damageKnockbackDef)
    def = defDB.getDefByName('AT_ChainDamageDef')
    expect(def.length).toBe(0)
  })

  test('PawnKnockback.DamageKnockbackDef should be determined as derived class of DamageDef', () => {
    const damageDefTypeInfo = typeInfoMap.getTypeInfoByName('DamageDef')!
    expect(damageDefTypeInfo).not.toBeUndefined()

    const derived = damageKnockbackDef.typeInfo
    expect(isDerivedType(derived, damageDefTypeInfo)).toBeTruthy()

    const underived = bulletExecutionerChain.typeInfo!
    expect(underived).not.toBeUndefined()
    expect(isDerivedType(underived, damageDefTypeInfo)).toBeFalsy()
  })
})
