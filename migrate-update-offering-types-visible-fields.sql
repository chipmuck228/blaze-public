-- ============================================================================
-- 迁移脚本：更新 offering_types 表的 config_schema，添加 visible_fields 配置
-- 目的：实现字段可见性配置，根据不同的 offering 类型显示不同的字段
-- 日期：2025-01-XX
-- ============================================================================

-- ==================== 第一步：更新 Course 类型的 config_schema ====================

UPDATE offering_types
SET config_schema = jsonb_build_object(
  'visible_fields', jsonb_build_object(
    'general', jsonb_build_object(
      'name', true,
      'slug', true,
      'description', true,
      'poster_url', true,
      'status', true
    ),
    'education', jsonb_build_object(
      'target_audience', true,
      'age_min', true,
      'age_max', true,
      'target_grades', true,
      'grade_level', true,
      'session_count', true,
      'duration_hours', true,
      'learning_outcomes', true,
      'prerequisites', true
    ),
    'pricing', jsonb_build_object(
      'base_price', true,
      'currency', true
    ),
    'policy', jsonb_build_object(
      'cancellation_policy', true
    ),
    'tags', jsonb_build_object(
      'subcategory_tags', true
    )
  ),
  'type_specific_fields', jsonb_build_array(
    jsonb_build_object(
      'name', 'default_session_count',
      'type', 'number',
      'label', 'Default Session Count',
      'placeholder', '10',
      'required', false
    ),
    jsonb_build_object(
      'name', 'default_weekly_frequency',
      'type', 'select',
      'label', 'Default Weekly Frequency',
      'required', false,
      'options', jsonb_build_array(
        jsonb_build_object('value', '1', 'label', '1 (Weekly)'),
        jsonb_build_object('value', '2', 'label', '2 (Bi-weekly)')
      ),
      'default', '1'
    ),
    jsonb_build_object(
      'name', 'default_duration_hours',
      'type', 'number',
      'label', 'Default Duration (Hours)',
      'placeholder', '1.5',
      'step', 0.5,
      'required', false
    ),
    jsonb_build_object(
      'name', 'supports_multi_child_discount',
      'type', 'boolean',
      'label', 'Supports Multi-Child Discount',
      'default', false
    )
  )
)
WHERE code = 'course';

-- ==================== 第二步：更新 Camp 类型的 config_schema ====================

UPDATE offering_types
SET config_schema = jsonb_build_object(
  'visible_fields', jsonb_build_object(
    'general', jsonb_build_object(
      'name', true,
      'slug', true,
      'description', true,
      'poster_url', true,
      'status', true
    ),
    'education', jsonb_build_object(
      'target_audience', true,
      'age_min', true,
      'age_max', true,
      'target_grades', true,
      'grade_level', true,
      'session_count', false,
      'duration_hours', true,
      'learning_outcomes', true,
      'prerequisites', true
    ),
    'pricing', jsonb_build_object(
      'base_price', true,
      'currency', true
    ),
    'policy', jsonb_build_object(
      'cancellation_policy', true
    ),
    'tags', jsonb_build_object(
      'subcategory_tags', true
    )
  ),
  'type_specific_fields', jsonb_build_array(
    jsonb_build_object(
      'name', 'default_duration_days',
      'type', 'number',
      'label', 'Default Duration (Days)',
      'placeholder', '5',
      'required', false
    ),
    jsonb_build_object(
      'name', 'default_daily_schedule',
      'type', 'object',
      'label', 'Default Daily Schedule',
      'description', 'Start and end times for daily schedule',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'name', 'start_time',
          'type', 'time',
          'label', 'Start Time',
          'default', '09:00'
        ),
        jsonb_build_object(
          'name', 'end_time',
          'type', 'time',
          'label', 'End Time',
          'default', '15:00'
        )
      )
    )
  )
)
WHERE code = 'camp';

-- ==================== 第三步：更新 Workshop 类型的 config_schema ====================

UPDATE offering_types
SET config_schema = jsonb_build_object(
  'visible_fields', jsonb_build_object(
    'general', jsonb_build_object(
      'name', true,
      'slug', true,
      'description', true,
      'poster_url', true,
      'status', true
    ),
    'education', jsonb_build_object(
      'target_audience', true,
      'age_min', true,
      'age_max', true,
      'target_grades', true,
      'grade_level', true,
      'session_count', false,
      'duration_hours', true,
      'learning_outcomes', false,
      'prerequisites', false
    ),
    'pricing', jsonb_build_object(
      'base_price', true,
      'currency', true
    ),
    'policy', jsonb_build_object(
      'cancellation_policy', true
    ),
    'tags', jsonb_build_object(
      'subcategory_tags', true
    )
  ),
  'type_specific_fields', jsonb_build_array(
    jsonb_build_object(
      'name', 'supports_drop_in',
      'type', 'boolean',
      'label', 'Supports Drop-In',
      'default', false
    ),
    jsonb_build_object(
      'name', 'drop_in_price',
      'type', 'number',
      'label', 'Drop-In Price',
      'placeholder', '50.00',
      'step', 0.01,
      'required', false,
      'dependsOn', jsonb_build_object(
        'field', 'supports_drop_in',
        'value', true
      )
    ),
    jsonb_build_object(
      'name', 'supports_multipass',
      'type', 'boolean',
      'label', 'Supports Multipass',
      'default', false
    ),
    jsonb_build_object(
      'name', 'weekly_frequency',
      'type', 'select',
      'label', 'Weekly Frequency',
      'options', jsonb_build_array(
        jsonb_build_object('value', '1', 'label', '1 (Weekly)'),
        jsonb_build_object('value', '2', 'label', '2 (Bi-weekly)')
      ),
      'default', '1',
      'required', false
    ),
    jsonb_build_object(
      'name', 'biweekly_interval',
      'type', 'number',
      'label', 'Bi-weekly Interval',
      'placeholder', '2',
      'required', false,
      'dependsOn', jsonb_build_object(
        'field', 'weekly_frequency',
        'value', 2
      )
    )
  )
)
WHERE code = 'workshop';

-- ==================== 第四步：更新 Free Trial 类型的 config_schema ====================

UPDATE offering_types
SET config_schema = jsonb_build_object(
  'visible_fields', jsonb_build_object(
    'general', jsonb_build_object(
      'name', true,
      'slug', true,
      'description', true,
      'poster_url', true,
      'status', true
    ),
    'education', jsonb_build_object(
      'target_audience', true,
      'age_min', true,
      'age_max', true,
      'target_grades', true,
      'grade_level', true,
      'session_count', false,
      'duration_hours', true,
      'learning_outcomes', false,
      'prerequisites', false
    ),
    'pricing', jsonb_build_object(
      'base_price', false,
      'currency', false
    ),
    'policy', jsonb_build_object(
      'cancellation_policy', false
    ),
    'tags', jsonb_build_object(
      'subcategory_tags', true
    )
  ),
  'type_specific_fields', jsonb_build_array()
)
WHERE code = 'free_trial';

-- ==================== 第五步：更新 Gift Card 类型的 config_schema ====================

UPDATE offering_types
SET config_schema = jsonb_build_object(
  'visible_fields', jsonb_build_object(
    'general', jsonb_build_object(
      'name', true,
      'slug', true,
      'description', true,
      'poster_url', true,
      'status', true
    ),
    'education', jsonb_build_object(
      'target_audience', false,
      'age_min', false,
      'age_max', false,
      'target_grades', false,
      'grade_level', false,
      'session_count', false,
      'duration_hours', false,
      'learning_outcomes', false,
      'prerequisites', false
    ),
    'pricing', jsonb_build_object(
      'base_price', true,
      'currency', true
    ),
    'policy', jsonb_build_object(
      'cancellation_policy', false
    ),
    'tags', jsonb_build_object(
      'subcategory_tags', false
    )
  ),
  'type_specific_fields', jsonb_build_array(
    jsonb_build_object(
      'name', 'denominations',
      'type', 'array',
      'label', 'Denominations (comma-separated)',
      'placeholder', '50, 100, 200, 500',
      'itemType', 'number',
      'separator', ',',
      'required', false
    ),
    jsonb_build_object(
      'name', 'expiry_months',
      'type', 'number',
      'label', 'Expiry (Months)',
      'placeholder', '12',
      'required', false
    )
  )
)
WHERE code = 'gift_card';

-- ==================== 第六步：更新 Care Service 类型的 config_schema ====================

UPDATE offering_types
SET config_schema = jsonb_build_object(
  'visible_fields', jsonb_build_object(
    'general', jsonb_build_object(
      'name', true,
      'slug', true,
      'description', true,
      'poster_url', true,
      'status', true
    ),
    'education', jsonb_build_object(
      'target_audience', false,
      'age_min', true,
      'age_max', true,
      'target_grades', false,
      'grade_level', false,
      'session_count', false,
      'duration_hours', true,
      'learning_outcomes', false,
      'prerequisites', false
    ),
    'pricing', jsonb_build_object(
      'base_price', true,
      'currency', true
    ),
    'policy', jsonb_build_object(
      'cancellation_policy', true
    ),
    'tags', jsonb_build_object(
      'subcategory_tags', false
    )
  ),
  'type_specific_fields', jsonb_build_array(
    jsonb_build_object(
      'name', 'service_duration_hours',
      'type', 'number',
      'label', 'Service Duration (Hours)',
      'placeholder', '2',
      'step', 0.5,
      'required', false
    ),
    jsonb_build_object(
      'name', 'requires_advance_booking',
      'type', 'boolean',
      'label', 'Requires Advance Booking',
      'default', false
    ),
    jsonb_build_object(
      'name', 'advance_booking_hours',
      'type', 'number',
      'label', 'Advance Booking (Hours)',
      'placeholder', '24',
      'required', false,
      'dependsOn', jsonb_build_object(
        'field', 'requires_advance_booking',
        'value', true
      )
    )
  )
)
WHERE code = 'care_service';

-- ==================== 第七步：更新 Lunch Service 类型的 config_schema ====================

UPDATE offering_types
SET config_schema = jsonb_build_object(
  'visible_fields', jsonb_build_object(
    'general', jsonb_build_object(
      'name', true,
      'slug', true,
      'description', true,
      'poster_url', true,
      'status', true
    ),
    'education', jsonb_build_object(
      'target_audience', false,
      'age_min', false,
      'age_max', false,
      'target_grades', false,
      'grade_level', false,
      'session_count', false,
      'duration_hours', false,
      'learning_outcomes', false,
      'prerequisites', false
    ),
    'pricing', jsonb_build_object(
      'base_price', true,
      'currency', true
    ),
    'policy', jsonb_build_object(
      'cancellation_policy', false
    ),
    'tags', jsonb_build_object(
      'subcategory_tags', false
    )
  ),
  'type_specific_fields', jsonb_build_array(
    jsonb_build_object(
      'name', 'meal_options',
      'type', 'array',
      'label', 'Meal Options (comma-separated)',
      'placeholder', 'vegetarian, non-vegetarian, vegan',
      'itemType', 'text',
      'separator', ',',
      'required', false
    ),
    jsonb_build_object(
      'name', 'requires_camp_enrollment',
      'type', 'boolean',
      'label', 'Requires Camp Enrollment',
      'default', false
    )
  )
)
WHERE code = 'lunch_service';

-- ==================== 完成 ====================

-- 输出完成信息
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'offering_types config_schema 更新完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '已完成的工作：';
  RAISE NOTICE '1. ✅ 更新 Course 类型的 visible_fields 配置';
  RAISE NOTICE '2. ✅ 更新 Camp 类型的 visible_fields 配置';
  RAISE NOTICE '3. ✅ 更新 Workshop 类型的 visible_fields 配置';
  RAISE NOTICE '4. ✅ 更新 Free Trial 类型的 visible_fields 配置';
  RAISE NOTICE '5. ✅ 更新 Gift Card 类型的 visible_fields 配置';
  RAISE NOTICE '6. ✅ 更新 Care Service 类型的 visible_fields 配置';
  RAISE NOTICE '7. ✅ 更新 Lunch Service 类型的 visible_fields 配置';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '- 更新 OfferingEditDialog 组件，根据 visible_fields 动态显示字段';
END $$;

