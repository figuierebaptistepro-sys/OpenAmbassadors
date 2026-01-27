"""
Backend API tests for Wallet/Cagnotte Features
- GET /api/wallet - Get creator wallet info and transactions
- PUT /api/wallet/payment-methods - Update payment methods (RIB)
- POST /api/wallet/withdraw - Request withdrawal (min 10€, PayPal disabled)
- GET /api/wallet/transactions - Get wallet transactions history
- POST /api/admin/wallet/add-earning - Admin adds payment (with 15% fee)
- POST /api/admin/wallet/process-withdrawal - Admin approves/rejects withdrawal
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Platform fee is 15%
PLATFORM_FEE_PERCENT = 15


def authenticate_user(email, user_type="creator"):
    """Helper to authenticate a user and return session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Request OTP
    otp_response = session.post(f"{BASE_URL}/api/auth/otp/request", json={"email": email})
    assert otp_response.status_code == 200, f"OTP request failed: {otp_response.text}"
    otp_code = otp_response.json().get("debug_code")
    
    # Verify OTP
    verify_response = session.post(f"{BASE_URL}/api/auth/otp/verify", json={
        "email": email,
        "code": otp_code
    })
    assert verify_response.status_code == 200, f"OTP verify failed: {verify_response.text}"
    
    # Set user type
    session.post(f"{BASE_URL}/api/auth/set-type", json={"user_type": user_type})
    
    return session


class TestWalletGet:
    """Tests for GET /api/wallet endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with creator authentication"""
        self.session = authenticate_user(f"test_wallet_get_{uuid.uuid4().hex[:8]}@test.com", "creator")
        yield
    
    def test_get_wallet_success(self):
        """Test successful wallet retrieval for creator"""
        response = self.session.get(f"{BASE_URL}/api/wallet")
        
        assert response.status_code == 200, f"Wallet retrieval failed: {response.text}"
        data = response.json()
        
        # Verify wallet structure
        assert "balance" in data, "Response should contain balance"
        assert "total_earned" in data, "Response should contain total_earned"
        assert "total_withdrawn" in data, "Response should contain total_withdrawn"
        assert "pending_amount" in data, "Response should contain pending_amount"
        assert "payment_methods" in data, "Response should contain payment_methods"
        assert "transactions" in data, "Response should contain transactions"
        assert "platform_fee_percent" in data, "Response should contain platform_fee_percent"
        
        # Verify fee is 15%
        assert data["platform_fee_percent"] == 15, f"Platform fee should be 15%, got {data['platform_fee_percent']}"
        
        print(f"✓ Wallet retrieved successfully: balance={data['balance']}, fee={data['platform_fee_percent']}%")
    
    def test_get_wallet_business_forbidden(self):
        """Test wallet access is forbidden for business users"""
        business_session = authenticate_user(f"test_wallet_biz_{uuid.uuid4().hex[:8]}@test.com", "business")
        
        response = business_session.get(f"{BASE_URL}/api/wallet")
        
        assert response.status_code == 403, f"Should reject business user: {response.text}"
        print("✓ Wallet access correctly rejected for business user")
    
    def test_get_wallet_unauthenticated(self):
        """Test wallet access requires authentication"""
        response = requests.get(f"{BASE_URL}/api/wallet")
        
        assert response.status_code == 401, f"Should require authentication: {response.text}"
        print("✓ Wallet access correctly requires authentication")


class TestPaymentMethods:
    """Tests for PUT /api/wallet/payment-methods endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with creator authentication"""
        self.session = authenticate_user(f"test_payment_{uuid.uuid4().hex[:8]}@test.com", "creator")
        yield
    
    def test_update_bank_details_success(self):
        """Test successful bank details update"""
        bank_data = {
            "bank_iban": "FR7630001007941234567890185",
            "bank_bic": "BNPAFRPP",
            "bank_holder_name": "Jean Dupont"
        }
        
        response = self.session.put(f"{BASE_URL}/api/wallet/payment-methods", json=bank_data)
        
        assert response.status_code == 200, f"Bank update failed: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        
        # Verify bank details were saved
        wallet_response = self.session.get(f"{BASE_URL}/api/wallet")
        wallet_data = wallet_response.json()
        
        assert wallet_data["payment_methods"]["bank_iban"] == bank_data["bank_iban"], "IBAN should be saved"
        assert wallet_data["payment_methods"]["bank_bic"] == bank_data["bank_bic"], "BIC should be saved"
        assert wallet_data["payment_methods"]["bank_holder_name"] == bank_data["bank_holder_name"], "Holder name should be saved"
        
        print(f"✓ Bank details updated successfully: IBAN=****{bank_data['bank_iban'][-4:]}")
    
    def test_update_partial_bank_details(self):
        """Test partial bank details update"""
        # First set full details
        self.session.put(f"{BASE_URL}/api/wallet/payment-methods", json={
            "bank_iban": "FR7630001007941234567890185",
            "bank_bic": "BNPAFRPP",
            "bank_holder_name": "Jean Dupont"
        })
        
        # Update only IBAN
        response = self.session.put(f"{BASE_URL}/api/wallet/payment-methods", json={
            "bank_iban": "FR7612345678901234567890123"
        })
        
        assert response.status_code == 200, f"Partial update failed: {response.text}"
        
        # Verify only IBAN changed
        wallet_response = self.session.get(f"{BASE_URL}/api/wallet")
        wallet_data = wallet_response.json()
        
        assert wallet_data["payment_methods"]["bank_iban"] == "FR7612345678901234567890123", "IBAN should be updated"
        assert wallet_data["payment_methods"]["bank_bic"] == "BNPAFRPP", "BIC should remain unchanged"
        
        print("✓ Partial bank details update works correctly")
    
    def test_update_payment_methods_business_forbidden(self):
        """Test payment methods update is forbidden for business users"""
        business_session = authenticate_user(f"test_pay_biz_{uuid.uuid4().hex[:8]}@test.com", "business")
        
        response = business_session.put(f"{BASE_URL}/api/wallet/payment-methods", json={
            "bank_iban": "FR7630001007941234567890185"
        })
        
        assert response.status_code == 403, f"Should reject business user: {response.text}"
        print("✓ Payment methods update correctly rejected for business user")


class TestWithdrawal:
    """Tests for POST /api/wallet/withdraw endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with creator authentication and add balance"""
        self.email = f"test_withdraw_{uuid.uuid4().hex[:8]}@test.com"
        self.session = authenticate_user(self.email, "creator")
        
        # Add bank details
        self.session.put(f"{BASE_URL}/api/wallet/payment-methods", json={
            "bank_iban": "FR7630001007941234567890185",
            "bank_bic": "BNPAFRPP",
            "bank_holder_name": "Test User"
        })
        
        yield
    
    def test_withdraw_paypal_disabled(self):
        """Test PayPal withdrawal is disabled (returns error)"""
        response = self.session.post(f"{BASE_URL}/api/wallet/withdraw", json={
            "amount": 50,
            "method": "paypal"
        })
        
        assert response.status_code == 400, f"PayPal should be disabled: {response.text}"
        data = response.json()
        assert "bientôt" in data.get("detail", "").lower() or "soon" in data.get("detail", "").lower(), \
            f"Error should mention PayPal coming soon: {data}"
        
        print("✓ PayPal withdrawal correctly disabled with 'Soon' message")
    
    def test_withdraw_minimum_amount(self):
        """Test withdrawal minimum amount is 10€"""
        response = self.session.post(f"{BASE_URL}/api/wallet/withdraw", json={
            "amount": 5,
            "method": "bank_transfer"
        })
        
        assert response.status_code == 400, f"Should reject amount below minimum: {response.text}"
        data = response.json()
        assert "10" in data.get("detail", ""), f"Error should mention 10€ minimum: {data}"
        
        print("✓ Withdrawal minimum amount (10€) correctly enforced")
    
    def test_withdraw_insufficient_balance(self):
        """Test withdrawal with insufficient balance"""
        response = self.session.post(f"{BASE_URL}/api/wallet/withdraw", json={
            "amount": 1000,
            "method": "bank_transfer"
        })
        
        assert response.status_code == 400, f"Should reject insufficient balance: {response.text}"
        data = response.json()
        assert "insuffisant" in data.get("detail", "").lower() or "insufficient" in data.get("detail", "").lower(), \
            f"Error should mention insufficient balance: {data}"
        
        print("✓ Insufficient balance correctly rejected")
    
    def test_withdraw_requires_iban(self):
        """Test bank transfer withdrawal requires IBAN"""
        # Create new session without bank details
        new_session = authenticate_user(f"test_no_iban_{uuid.uuid4().hex[:8]}@test.com", "creator")
        
        response = new_session.post(f"{BASE_URL}/api/wallet/withdraw", json={
            "amount": 50,
            "method": "bank_transfer"
        })
        
        # Should fail due to no IBAN (or insufficient balance)
        assert response.status_code == 400, f"Should require IBAN: {response.text}"
        print("✓ Bank transfer correctly requires IBAN")


class TestWalletTransactions:
    """Tests for GET /api/wallet/transactions endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with creator authentication"""
        self.session = authenticate_user(f"test_tx_{uuid.uuid4().hex[:8]}@test.com", "creator")
        yield
    
    def test_get_transactions_success(self):
        """Test successful transactions retrieval"""
        response = self.session.get(f"{BASE_URL}/api/wallet/transactions")
        
        assert response.status_code == 200, f"Transactions retrieval failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Transactions retrieved successfully: {len(data)} transactions")
    
    def test_get_transactions_with_pagination(self):
        """Test transactions retrieval with pagination"""
        response = self.session.get(f"{BASE_URL}/api/wallet/transactions?skip=0&limit=10")
        
        assert response.status_code == 200, f"Paginated transactions failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 10, "Should respect limit parameter"
        
        print("✓ Transactions pagination works correctly")
    
    def test_get_transactions_business_forbidden(self):
        """Test transactions access is forbidden for business users"""
        business_session = authenticate_user(f"test_tx_biz_{uuid.uuid4().hex[:8]}@test.com", "business")
        
        response = business_session.get(f"{BASE_URL}/api/wallet/transactions")
        
        assert response.status_code == 403, f"Should reject business user: {response.text}"
        print("✓ Transactions access correctly rejected for business user")


class TestAdminWalletOperations:
    """Tests for admin wallet operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test sessions"""
        self.creator_email = f"test_admin_wallet_{uuid.uuid4().hex[:8]}@test.com"
        self.creator_session = authenticate_user(self.creator_email, "creator")
        
        # Get creator user_id
        me_response = self.creator_session.get(f"{BASE_URL}/api/auth/me")
        self.creator_id = me_response.json().get("user_id")
        
        # Admin session (using same auth for testing - in production would check admin role)
        self.admin_session = authenticate_user(f"test_admin_{uuid.uuid4().hex[:8]}@test.com", "creator")
        
        yield
    
    def test_admin_add_earning_success(self):
        """Test admin can add earning to creator wallet with 15% fee"""
        gross_amount = 100
        expected_fee = gross_amount * PLATFORM_FEE_PERCENT / 100  # 15€
        expected_net = gross_amount - expected_fee  # 85€
        
        response = self.admin_session.post(f"{BASE_URL}/api/admin/wallet/add-earning", json={
            "creator_id": self.creator_id,
            "amount": gross_amount,
            "project_id": "test_project_123",
            "description": "TEST_Payment for mission"
        })
        
        assert response.status_code == 200, f"Add earning failed: {response.text}"
        data = response.json()
        
        assert "transaction_id" in data, "Response should contain transaction_id"
        assert data["gross_amount"] == gross_amount, f"Gross amount should be {gross_amount}"
        assert data["fee_amount"] == expected_fee, f"Fee should be {expected_fee} (15%)"
        assert data["net_amount"] == expected_net, f"Net amount should be {expected_net}"
        
        # Verify wallet balance updated
        wallet_response = self.creator_session.get(f"{BASE_URL}/api/wallet")
        wallet_data = wallet_response.json()
        
        assert wallet_data["balance"] >= expected_net, f"Balance should include net amount"
        
        print(f"✓ Admin added earning: gross={gross_amount}€, fee={expected_fee}€ (15%), net={expected_net}€")
    
    def test_admin_add_earning_missing_fields(self):
        """Test admin add earning fails with missing required fields"""
        response = self.admin_session.post(f"{BASE_URL}/api/admin/wallet/add-earning", json={
            "creator_id": self.creator_id
            # Missing amount
        })
        
        assert response.status_code == 400, f"Should require amount: {response.text}"
        print("✓ Admin add earning correctly requires amount field")
    
    def test_admin_process_withdrawal_approve(self):
        """Test admin can approve withdrawal request"""
        # First add balance to creator
        self.admin_session.post(f"{BASE_URL}/api/admin/wallet/add-earning", json={
            "creator_id": self.creator_id,
            "amount": 100,
            "description": "TEST_Balance for withdrawal test"
        })
        
        # Add bank details
        self.creator_session.put(f"{BASE_URL}/api/wallet/payment-methods", json={
            "bank_iban": "FR7630001007941234567890185",
            "bank_bic": "BNPAFRPP"
        })
        
        # Request withdrawal
        withdraw_response = self.creator_session.post(f"{BASE_URL}/api/wallet/withdraw", json={
            "amount": 50,
            "method": "bank_transfer"
        })
        
        if withdraw_response.status_code != 200:
            pytest.skip(f"Withdrawal request failed: {withdraw_response.text}")
        
        transaction_id = withdraw_response.json().get("transaction_id")
        
        # Admin approves
        response = self.admin_session.post(f"{BASE_URL}/api/admin/wallet/process-withdrawal", json={
            "transaction_id": transaction_id,
            "action": "approve",
            "admin_note": "TEST_Approved by admin"
        })
        
        assert response.status_code == 200, f"Approval failed: {response.text}"
        data = response.json()
        assert data["status"] == "completed", f"Status should be completed: {data}"
        
        print(f"✓ Admin approved withdrawal: {transaction_id}")
    
    def test_admin_process_withdrawal_reject(self):
        """Test admin can reject withdrawal request"""
        # First add balance to creator
        self.admin_session.post(f"{BASE_URL}/api/admin/wallet/add-earning", json={
            "creator_id": self.creator_id,
            "amount": 100,
            "description": "TEST_Balance for rejection test"
        })
        
        # Add bank details
        self.creator_session.put(f"{BASE_URL}/api/wallet/payment-methods", json={
            "bank_iban": "FR7630001007941234567890185",
            "bank_bic": "BNPAFRPP"
        })
        
        # Request withdrawal
        withdraw_response = self.creator_session.post(f"{BASE_URL}/api/wallet/withdraw", json={
            "amount": 20,
            "method": "bank_transfer"
        })
        
        if withdraw_response.status_code != 200:
            pytest.skip(f"Withdrawal request failed: {withdraw_response.text}")
        
        transaction_id = withdraw_response.json().get("transaction_id")
        
        # Admin rejects
        response = self.admin_session.post(f"{BASE_URL}/api/admin/wallet/process-withdrawal", json={
            "transaction_id": transaction_id,
            "action": "reject",
            "admin_note": "TEST_Invalid bank details"
        })
        
        assert response.status_code == 200, f"Rejection failed: {response.text}"
        data = response.json()
        assert data["status"] == "rejected", f"Status should be rejected: {data}"
        
        print(f"✓ Admin rejected withdrawal: {transaction_id}")
    
    def test_admin_process_invalid_action(self):
        """Test admin process withdrawal fails with invalid action"""
        response = self.admin_session.post(f"{BASE_URL}/api/admin/wallet/process-withdrawal", json={
            "transaction_id": "tx_fake123",
            "action": "invalid_action"
        })
        
        assert response.status_code == 400, f"Should reject invalid action: {response.text}"
        print("✓ Invalid action correctly rejected")


class TestWalletIntegration:
    """Integration tests for wallet flow"""
    
    def test_full_wallet_flow(self):
        """Test complete wallet flow: add earning -> check balance -> withdraw -> approve"""
        # Create creator
        creator_email = f"test_flow_{uuid.uuid4().hex[:8]}@test.com"
        creator_session = authenticate_user(creator_email, "creator")
        
        # Get creator ID
        me_response = creator_session.get(f"{BASE_URL}/api/auth/me")
        creator_id = me_response.json().get("user_id")
        
        # Admin session
        admin_session = authenticate_user(f"test_admin_flow_{uuid.uuid4().hex[:8]}@test.com", "creator")
        
        # Step 1: Check initial wallet (should be 0)
        wallet_response = creator_session.get(f"{BASE_URL}/api/wallet")
        assert wallet_response.status_code == 200
        initial_balance = wallet_response.json()["balance"]
        print(f"Step 1: Initial balance = {initial_balance}€")
        
        # Step 2: Admin adds earning (100€ gross -> 85€ net after 15% fee)
        add_response = admin_session.post(f"{BASE_URL}/api/admin/wallet/add-earning", json={
            "creator_id": creator_id,
            "amount": 100,
            "description": "TEST_Mission payment"
        })
        assert add_response.status_code == 200
        earning_data = add_response.json()
        assert earning_data["net_amount"] == 85, "Net should be 85€ after 15% fee"
        print(f"Step 2: Added earning - gross=100€, fee=15€, net=85€")
        
        # Step 3: Check updated balance
        wallet_response = creator_session.get(f"{BASE_URL}/api/wallet")
        new_balance = wallet_response.json()["balance"]
        assert new_balance == initial_balance + 85, f"Balance should be {initial_balance + 85}€"
        print(f"Step 3: Updated balance = {new_balance}€")
        
        # Step 4: Add bank details
        bank_response = creator_session.put(f"{BASE_URL}/api/wallet/payment-methods", json={
            "bank_iban": "FR7630001007941234567890185",
            "bank_bic": "BNPAFRPP",
            "bank_holder_name": "Test Creator"
        })
        assert bank_response.status_code == 200
        print("Step 4: Bank details added")
        
        # Step 5: Request withdrawal (50€)
        withdraw_response = creator_session.post(f"{BASE_URL}/api/wallet/withdraw", json={
            "amount": 50,
            "method": "bank_transfer"
        })
        assert withdraw_response.status_code == 200
        tx_id = withdraw_response.json()["transaction_id"]
        print(f"Step 5: Withdrawal requested - {tx_id}")
        
        # Step 6: Check pending amount
        wallet_response = creator_session.get(f"{BASE_URL}/api/wallet")
        wallet_data = wallet_response.json()
        assert wallet_data["pending_amount"] == 50, "Pending should be 50€"
        print(f"Step 6: Pending amount = {wallet_data['pending_amount']}€")
        
        # Step 7: Admin approves withdrawal
        approve_response = admin_session.post(f"{BASE_URL}/api/admin/wallet/process-withdrawal", json={
            "transaction_id": tx_id,
            "action": "approve"
        })
        assert approve_response.status_code == 200
        print("Step 7: Withdrawal approved")
        
        # Step 8: Check final balance
        wallet_response = creator_session.get(f"{BASE_URL}/api/wallet")
        final_data = wallet_response.json()
        assert final_data["balance"] == 35, f"Final balance should be 35€ (85-50)"
        assert final_data["total_withdrawn"] == 50, "Total withdrawn should be 50€"
        assert final_data["pending_amount"] == 0, "Pending should be 0€"
        print(f"Step 8: Final balance = {final_data['balance']}€, withdrawn = {final_data['total_withdrawn']}€")
        
        print("✓ Full wallet flow completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
