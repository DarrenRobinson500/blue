from datetime import date
from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.core.models import Function, User, UserFunctionHistory
from apps.core.services.function_service import assign_function, remove_function


def make_user(email, role='admin'):
    return User.objects.create_user(email=email, password='testpass', role=role)


def make_function(name, code):
    return Function.objects.create(name=name, code=code)


class AssignFunctionTests(TestCase):
    def setUp(self):
        self.admin = make_user('admin@test.com')
        self.user = make_user('user@test.com', role='cro')
        self.fn_a = make_function('Function A', 'FN_A')
        self.fn_b = make_function('Function B', 'FN_B')

    def test_assign_to_user_with_no_prior_function(self):
        assign_function(self.user, self.fn_a, self.admin, start_date=date(2026, 1, 1))
        self.user.refresh_from_db()
        self.assertEqual(self.user.function, self.fn_a)
        record = UserFunctionHistory.objects.get(user=self.user)
        self.assertEqual(record.function, self.fn_a)
        self.assertEqual(record.start_date, date(2026, 1, 1))
        self.assertIsNone(record.end_date)

    def test_assign_closes_prior_record_and_creates_new(self):
        assign_function(self.user, self.fn_a, self.admin, start_date=date(2026, 1, 1))
        assign_function(self.user, self.fn_b, self.admin, start_date=date(2026, 6, 1))
        self.user.refresh_from_db()
        self.assertEqual(self.user.function, self.fn_b)
        old = UserFunctionHistory.objects.get(user=self.user, function=self.fn_a)
        self.assertEqual(old.end_date, date(2026, 5, 31))
        new = UserFunctionHistory.objects.get(user=self.user, function=self.fn_b)
        self.assertIsNone(new.end_date)

    def test_assign_same_function_raises(self):
        assign_function(self.user, self.fn_a, self.admin)
        with self.assertRaises(ValidationError):
            assign_function(self.user, self.fn_a, self.admin)

    def test_remove_function_closes_record_and_clears_user(self):
        assign_function(self.user, self.fn_a, self.admin, start_date=date(2026, 1, 1))
        remove_function(self.user, self.admin, end_date=date(2026, 6, 1))
        self.user.refresh_from_db()
        self.assertIsNone(self.user.function)
        record = UserFunctionHistory.objects.get(user=self.user, function=self.fn_a)
        self.assertEqual(record.end_date, date(2026, 6, 1))

    def test_remove_function_with_no_function_raises(self):
        with self.assertRaises(ValidationError):
            remove_function(self.user, self.admin)

    def test_atomicity_on_assign(self):
        from unittest.mock import patch
        assign_function(self.user, self.fn_a, self.admin, start_date=date(2026, 1, 1))
        # Force save() to fail after history record would be created
        with patch.object(User, 'save', side_effect=Exception('forced failure')):
            with self.assertRaises(Exception):
                assign_function(self.user, self.fn_b, self.admin, start_date=date(2026, 6, 1))
        # Old history record should still be open (rolled back)
        self.user.refresh_from_db()
        self.assertEqual(self.user.function, self.fn_a)
        old = UserFunctionHistory.objects.get(user=self.user, function=self.fn_a)
        self.assertIsNone(old.end_date)
        self.assertFalse(UserFunctionHistory.objects.filter(user=self.user, function=self.fn_b).exists())
